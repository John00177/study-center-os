import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SetSalaryDto } from "./dto/set-salary.dto";
import { RecordSalaryPaymentDto } from "./dto/record-salary-payment.dto";

const WEEKS_PER_MONTH = 4.345; // 365.25 / 7 / 12 — used to project a weekly recurring schedule onto a month

function currentMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthsAgo(n: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function scheduleHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return Math.max(0, (endH * 60 + endM - (startH * 60 + startM)) / 60);
}

@Injectable()
export class SalaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---- Setting salaries ----

  async setTeacherSalary(organizationId: string, actorId: string, dto: SetSalaryDto) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: dto.teacherId, organizationId } });
    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }
    if (dto.type === "hourly" && dto.hourlyRate == null) {
      throw new BadRequestException("hourlyRate is required for hourly salaries");
    }
    if (dto.type === "per_student" && dto.perStudentRate == null) {
      throw new BadRequestException("perStudentRate is required for per_student salaries");
    }

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();

    const existing = await this.prisma.teacherSalary.findFirst({
      where: { teacherId: dto.teacherId, organizationId, status: "active", effectiveTo: null },
    });
    if (existing) {
      // Close the old salary out rather than mutating it, so salary history
      // (and any SalaryPayment rows already linked to it) stays intact.
      await this.prisma.teacherSalary.update({ where: { id: existing.id }, data: { effectiveTo: effectiveFrom } });
    }

    const salary = await this.prisma.teacherSalary.create({
      data: {
        teacherId: dto.teacherId,
        organizationId,
        amount: dto.amount,
        currency: dto.currency ?? "UZS",
        type: dto.type,
        hourlyRate: dto.hourlyRate,
        perStudentRate: dto.perStudentRate,
        effectiveFrom,
        notes: dto.notes,
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: existing ? "salary.updated" : "salary.created",
      entityType: "TeacherSalary",
      entityId: salary.id,
      afterValue: salary as unknown as Prisma.InputJsonValue,
    });

    return salary;
  }

  async getTeacherSalary(organizationId: string, teacherId: string) {
    return this.prisma.teacherSalary.findFirst({
      where: { teacherId, organizationId, status: "active", effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  // ---- Estimation ----

  async calculateEstimatedMonthlySalary(organizationId: string, teacherId: string, salary: {
    type: string;
    amount: number;
    hourlyRate: number | null;
    perStudentRate: number | null;
  }): Promise<number> {
    if (salary.type === "hourly") {
      if (!salary.hourlyRate) return 0;
      const weeklyHours = await this.weeklyScheduledHours(organizationId, teacherId);
      return Math.round(weeklyHours * WEEKS_PER_MONTH * salary.hourlyRate);
    }
    if (salary.type === "per_student") {
      if (!salary.perStudentRate) return 0;
      const studentCount = await this.activeStudentCount(organizationId, teacherId);
      return studentCount * salary.perStudentRate;
    }
    return salary.amount;
  }

  private async teacherGroupIds(organizationId: string, teacherId: string): Promise<string[]> {
    const assignments = await this.prisma.groupTeacherAssignment.findMany({
      where: { organizationId, teacherId, status: "active" },
    });
    return [...new Set(assignments.map((a) => a.groupId))];
  }

  private async weeklyScheduledHours(organizationId: string, teacherId: string): Promise<number> {
    const groupIds = await this.teacherGroupIds(organizationId, teacherId);
    if (groupIds.length === 0) return 0;
    const schedules = await this.prisma.schedule.findMany({ where: { organizationId, groupId: { in: groupIds } } });
    return schedules.reduce((sum, s) => sum + scheduleHours(s.startTime, s.endTime), 0);
  }

  private async activeStudentCount(organizationId: string, teacherId: string): Promise<number> {
    const groupIds = await this.teacherGroupIds(organizationId, teacherId);
    if (groupIds.length === 0) return 0;
    const memberships = await this.prisma.groupMembership.findMany({
      where: { organizationId, groupId: { in: groupIds }, status: "active" },
    });
    return new Set(memberships.map((m) => m.studentId)).size;
  }

  // ---- Auto-create pending payments for the current month (MVP stand-in for a cron job) ----

  async ensureCurrentMonthPayments(organizationId: string): Promise<void> {
    const month = currentMonth();
    const activeSalaries = await this.prisma.teacherSalary.findMany({
      where: { organizationId, status: "active", effectiveTo: null },
    });
    for (const salary of activeSalaries) {
      const existing = await this.prisma.salaryPayment.findUnique({
        where: { teacherSalaryId_month: { teacherSalaryId: salary.id, month } },
      });
      if (existing) continue;
      const amount = await this.calculateEstimatedMonthlySalary(organizationId, salary.teacherId, salary);
      await this.prisma.salaryPayment.create({
        data: { teacherSalaryId: salary.id, organizationId, amount, currency: salary.currency, month, status: "pending" },
      });
    }
  }

  // ---- Owner-facing reads ----

  async getAllSalaries(organizationId: string) {
    await this.ensureCurrentMonthPayments(organizationId);
    const month = currentMonth();

    const salaries = await this.prisma.teacherSalary.findMany({
      where: { organizationId, status: "active", effectiveTo: null },
      orderBy: { createdAt: "desc" },
    });
    const teacherIds = salaries.map((s) => s.teacherId);
    const teachers = teacherIds.length
      ? await this.prisma.teacher.findMany({ where: { id: { in: teacherIds } } })
      : [];
    const teacherById = new Map(teachers.map((t) => [t.id, t]));

    const payments = salaries.length
      ? await this.prisma.salaryPayment.findMany({
          where: { teacherSalaryId: { in: salaries.map((s) => s.id) } },
          orderBy: { createdAt: "desc" },
        })
      : [];
    const thisMonthByLine = new Map(payments.filter((p) => p.month === month).map((p) => [p.teacherSalaryId, p]));
    const lastPaidByLine = new Map<string, Date>();
    for (const p of payments) {
      if (p.status !== "paid" || !p.paidAt) continue;
      const current = lastPaidByLine.get(p.teacherSalaryId);
      if (!current || p.paidAt > current) lastPaidByLine.set(p.teacherSalaryId, p.paidAt);
    }

    return salaries.map((salary) => {
      const thisMonthPayment = thisMonthByLine.get(salary.id);
      return {
        id: salary.id,
        teacherId: salary.teacherId,
        teacherName: teacherById.get(salary.teacherId)?.name ?? "Unknown",
        amount: salary.amount,
        currency: salary.currency,
        type: salary.type,
        hourlyRate: salary.hourlyRate,
        perStudentRate: salary.perStudentRate,
        status: salary.status,
        effectiveFrom: salary.effectiveFrom,
        notes: salary.notes,
        thisMonthPaymentStatus: thisMonthPayment?.status ?? "pending",
        thisMonthPaymentId: thisMonthPayment?.id ?? null,
        lastPaidAt: lastPaidByLine.get(salary.id) ?? null,
      };
    });
  }

  async getSalaryAnalytics(organizationId: string) {
    const salaries = await this.getAllSalaries(organizationId);

    let totalMonthlySalaries = 0;
    let totalHourlyEstimated = 0;
    let totalPerStudentEstimated = 0;

    for (const s of salaries) {
      const raw = await this.prisma.teacherSalary.findUniqueOrThrow({ where: { id: s.id } });
      const estimated = await this.calculateEstimatedMonthlySalary(organizationId, s.teacherId, raw);
      if (s.type === "fixed") totalMonthlySalaries += estimated;
      else if (s.type === "hourly") totalHourlyEstimated += estimated;
      else totalPerStudentEstimated += estimated;
    }

    const totalSalaryExpense = totalMonthlySalaries + totalHourlyEstimated + totalPerStudentEstimated;

    const months = [monthsAgo(5), monthsAgo(4), monthsAgo(3), monthsAgo(2), monthsAgo(1), currentMonth()];
    const historyRows = await this.prisma.salaryPayment.groupBy({
      by: ["month", "status"],
      where: { organizationId, month: { in: months } },
      _sum: { amount: true },
    });
    const monthlyHistory = months.map((month) => {
      const paid = historyRows.find((r) => r.month === month && r.status === "paid")?._sum.amount ?? 0;
      const pending = historyRows
        .filter((r) => r.month === month && r.status !== "paid")
        .reduce((sum, r) => sum + (r._sum.amount ?? 0), 0);
      return { month, totalPaid: paid, totalPending: pending };
    });

    return {
      totalMonthlySalaries,
      totalHourlyEstimated,
      totalPerStudentEstimated,
      totalSalaryExpense,
      teacherSalaries: salaries.map((s) => ({
        teacherId: s.teacherId,
        teacherName: s.teacherName,
        amount: s.amount,
        type: s.type,
        status: s.status,
        thisMonthPaymentStatus: s.thisMonthPaymentStatus,
        lastPaidAt: s.lastPaidAt,
      })),
      monthlyHistory,
    };
  }

  // ---- Payments ----

  async recordSalaryPayment(organizationId: string, actorId: string, teacherSalaryId: string, dto: RecordSalaryPaymentDto) {
    const salary = await this.prisma.teacherSalary.findFirst({ where: { id: teacherSalaryId, organizationId } });
    if (!salary) {
      throw new NotFoundException("Salary not found");
    }

    const payment = await this.prisma.salaryPayment.upsert({
      where: { teacherSalaryId_month: { teacherSalaryId, month: dto.month } },
      create: {
        teacherSalaryId,
        organizationId,
        amount: dto.amount,
        currency: salary.currency,
        month: dto.month,
        status: "paid",
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
      },
      update: {
        amount: dto.amount,
        status: "paid",
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "salary.payment_recorded",
      entityType: "SalaryPayment",
      entityId: payment.id,
      afterValue: payment as unknown as Prisma.InputJsonValue,
    });

    return payment;
  }

  async getSalaryPaymentHistory(organizationId: string, teacherSalaryId: string) {
    const salary = await this.prisma.teacherSalary.findFirst({ where: { id: teacherSalaryId, organizationId } });
    if (!salary) {
      throw new NotFoundException("Salary not found");
    }
    return this.prisma.salaryPayment.findMany({
      where: { teacherSalaryId },
      orderBy: { month: "desc" },
    });
  }

  async markAllPaidForCurrentMonth(organizationId: string, actorId: string) {
    await this.ensureCurrentMonthPayments(organizationId);
    const month = currentMonth();
    const pending = await this.prisma.salaryPayment.findMany({
      where: { organizationId, month, status: { not: "paid" } },
    });
    for (const payment of pending) {
      await this.prisma.salaryPayment.update({
        where: { id: payment.id },
        data: { status: "paid", paidAt: new Date(), paymentMethod: payment.paymentMethod ?? "cash" },
      });
    }

    await this.auditService.record({
      organizationId,
      actorId,
      action: "salary.mark_all_paid",
      entityType: "SalaryPayment",
      entityId: month,
      afterValue: { month, count: pending.length } as unknown as Prisma.InputJsonValue,
    });

    return { paidCount: pending.length };
  }

  // ---- Teacher-facing read ----

  async getTeacherOwnSalary(organizationId: string, teacherId: string) {
    const salary = await this.getTeacherSalary(organizationId, teacherId);
    if (!salary) {
      return null;
    }

    const month = currentMonth();
    const payments = await this.prisma.salaryPayment.findMany({
      where: { teacherSalaryId: salary.id },
      orderBy: { month: "desc" },
    });
    const thisMonthPayment = payments.find((p) => p.month === month);
    const lastPaid = payments.find((p) => p.status === "paid" && p.paidAt);

    return {
      amount: salary.amount,
      type: salary.type,
      currency: salary.currency,
      hourlyRate: salary.hourlyRate,
      perStudentRate: salary.perStudentRate,
      effectiveFrom: salary.effectiveFrom,
      status: salary.status,
      thisMonthPaymentStatus: thisMonthPayment?.status ?? "pending",
      lastPaidAt: lastPaid?.paidAt ?? null,
      paymentHistory: payments,
    };
  }
}
