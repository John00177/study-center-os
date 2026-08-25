import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateFinancialAccountDto } from "./dto/create-financial-account.dto";
import { UpdateFinancialAccountDto } from "./dto/update-financial-account.dto";
import { CreateChargeDto } from "./dto/create-charge.dto";
import { UpdateChargeDto } from "./dto/update-charge.dto";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { ChargesQueryDto } from "./dto/charges-query.dto";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---- Financial accounts ----

  async findAllAccounts(organizationId: string) {
    const accounts = await this.prisma.financialAccount.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    const balances = await this.prisma.financialTransaction.groupBy({
      by: ["financialAccountId", "direction"],
      where: { organizationId, financialAccountId: { in: accounts.map((a) => a.id) } },
      _sum: { amount: true },
    });

    const balanceByAccount = new Map<string, number>();
    for (const row of balances) {
      if (!row.financialAccountId) continue;
      const delta = (row._sum.amount ?? 0) * (row.direction === "credit" ? 1 : -1);
      balanceByAccount.set(row.financialAccountId, (balanceByAccount.get(row.financialAccountId) ?? 0) + delta);
    }

    return accounts.map((account) => ({
      ...account,
      balance: balanceByAccount.get(account.id) ?? 0,
    }));
  }

  async findOneAccount(organizationId: string, id: string) {
    const account = await this.prisma.financialAccount.findFirst({ where: { id, organizationId } });
    if (!account) {
      throw new NotFoundException("Financial account not found");
    }
    return account;
  }

  async createAccount(organizationId: string, actorId: string, dto: CreateFinancialAccountDto) {
    const account = await this.prisma.financialAccount.create({ data: { ...dto, organizationId } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "finance.account_created",
      entityType: "FinancialAccount",
      entityId: account.id,
      afterValue: account as unknown as Prisma.InputJsonValue,
    });

    return account;
  }

  async updateAccount(organizationId: string, actorId: string, id: string, dto: UpdateFinancialAccountDto) {
    const existing = await this.findOneAccount(organizationId, id);
    const account = await this.prisma.financialAccount.update({ where: { id }, data: dto });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "finance.account_updated",
      entityType: "FinancialAccount",
      entityId: account.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: account as unknown as Prisma.InputJsonValue,
    });

    return account;
  }

  async removeAccount(organizationId: string, actorId: string, id: string) {
    const existing = await this.findOneAccount(organizationId, id);
    await this.prisma.financialAccount.delete({ where: { id } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "finance.account_deleted",
      entityType: "FinancialAccount",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }

  // ---- Charges ----

  private async withStudents<T extends { studentId: string }>(items: T[]) {
    const studentIds = [...new Set(items.map((i) => i.studentId))];
    const students = await this.prisma.student.findMany({ where: { id: { in: studentIds } } });
    const studentById = new Map(students.map((s) => [s.id, s]));
    return items.map((item) => ({ ...item, student: studentById.get(item.studentId) ?? null }));
  }

  /**
   * A student's group isn't stored on the Charge itself, so it's resolved
   * via their active GroupMembership — same manual-join pattern used
   * throughout this codebase (Charge/Payment have no formal Prisma relations
   * to Student, see e.g. withStudents above).
   */
  private async withGroups<T extends { studentId: string }>(items: T[]) {
    const studentIds = [...new Set(items.map((i) => i.studentId))];
    const memberships = studentIds.length
      ? await this.prisma.groupMembership.findMany({ where: { studentId: { in: studentIds }, status: "active" } })
      : [];
    const groupIds = [...new Set(memberships.map((m) => m.groupId))];
    const groups = groupIds.length ? await this.prisma.group.findMany({ where: { id: { in: groupIds } } }) : [];
    const groupById = new Map(groups.map((g) => [g.id, g]));
    const courseIds = [...new Set(groups.map((g) => g.courseId))];
    const courses = courseIds.length ? await this.prisma.course.findMany({ where: { id: { in: courseIds } } }) : [];
    const courseById = new Map(courses.map((c) => [c.id, c]));

    const groupByStudent = new Map<string, { id: string; name: string; courseName: string | null }>();
    for (const m of memberships) {
      if (groupByStudent.has(m.studentId)) continue;
      const group = groupById.get(m.groupId);
      if (!group) continue;
      groupByStudent.set(m.studentId, {
        id: group.id,
        name: group.name,
        courseName: courseById.get(group.courseId)?.name ?? null,
      });
    }

    return items.map((item) => ({ ...item, group: groupByStudent.get(item.studentId) ?? null }));
  }

  /**
   * "Overdue" is computed on read, never stored — a pending charge past its
   * due date shows as overdue here without any DB write, so it flips back
   * automatically once paid or the date is corrected.
   */
  private withComputedUrgency<T extends { status: string; dueDate: Date }>(items: T[]) {
    const now = Date.now();
    return items.map((item) => {
      const diffDays = Math.floor((item.dueDate.getTime() - now) / MS_PER_DAY);
      const isOverdue = item.status === "overdue" || (item.status === "pending" && diffDays < 0);
      return {
        ...item,
        isOverdue,
        daysOverdue: isOverdue ? Math.abs(diffDays) : null,
        daysUntilDue: item.status === "pending" && diffDays >= 0 ? diffDays : null,
      };
    });
  }

  private sortCharges<T extends { status: string; dueDate: Date; amount: number; createdAt: Date }>(
    charges: (T & { student: { name: string } | null })[],
    sortBy: string,
  ) {
    // "overdue" can also be a manually-set stored status (UpdateChargeDto
    // still allows it) as well as a computed one (pending + past due) — both
    // sort to the front the same way.
    const isPastDue = (c: T) => c.status === "overdue" || (c.status === "pending" && c.dueDate.getTime() < Date.now());
    const rank = (c: T) => (isPastDue(c) ? 0 : c.status === "pending" ? 1 : c.status === "paid" ? 2 : 3);

    const sorted = [...charges];
    switch (sortBy) {
      case "dueDate":
        sorted.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        break;
      case "amount":
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case "name":
        sorted.sort((a, b) => (a.student?.name ?? "").localeCompare(b.student?.name ?? ""));
        break;
      case "urgency":
      default:
        sorted.sort((a, b) => {
          const r = rank(a) - rank(b);
          if (r !== 0) return r;
          if (rank(a) <= 1) return a.dueDate.getTime() - b.dueDate.getTime();
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        break;
    }
    return sorted;
  }

  async findAllCharges(organizationId: string, filters: ChargesQueryDto = {}) {
    const charges = await this.prisma.charge.findMany({
      where: {
        organizationId,
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
    });

    const withStudents = await this.withStudents(charges);
    const withGroups = await this.withGroups(withStudents);
    const filteredByGroup = filters.groupId
      ? withGroups.filter((c) => c.group?.id === filters.groupId)
      : withGroups;
    const withUrgency = this.withComputedUrgency(filteredByGroup);

    return this.sortCharges(withUrgency, filters.sortBy ?? "urgency");
  }

  async findOneCharge(organizationId: string, id: string) {
    const charge = await this.prisma.charge.findFirst({ where: { id, organizationId } });
    if (!charge) {
      throw new NotFoundException("Charge not found");
    }
    const [withStudent] = await this.withStudents([charge]);
    const [withGroup] = await this.withGroups([withStudent]);
    const [withUrgency] = this.withComputedUrgency([withGroup]);
    return withUrgency;
  }

  async getOverdueCharges(organizationId: string) {
    const charges = await this.prisma.charge.findMany({
      where: { organizationId, status: "pending", dueDate: { lt: new Date() } },
      orderBy: { dueDate: "asc" },
    });
    const withStudents = await this.withStudents(charges);
    const withGroups = await this.withGroups(withStudents);
    return this.withComputedUrgency(withGroups);
  }

  async getPaymentSummary(organizationId: string) {
    const now = new Date();
    // A charge counts as "overdue" here either because it's stored that way
    // (literal status: "overdue") or because it's still pending past its due
    // date (computed overdue) — see withComputedUrgency/sortCharges above,
    // which treat both the same way. Summing only status: "pending" here
    // would silently drop literal-overdue charges from "Total Owed".
    const overdueWhere: Prisma.ChargeWhereInput = {
      organizationId,
      OR: [{ status: "overdue" }, { status: "pending", dueDate: { lt: now } }],
    };
    const [pendingCharges, overdueCharges, paidCount, paymentsThisMonth] = await Promise.all([
      this.prisma.charge.aggregate({
        where: { organizationId, status: "pending", dueDate: { gte: now } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.charge.aggregate({
        where: overdueWhere,
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.charge.count({ where: { organizationId, status: "paid" } }),
      this.prisma.payment.aggregate({
        where: { organizationId, createdAt: { gte: startOfMonth() } },
        _sum: { amount: true },
      }),
    ]);

    const overdueStudents = await this.prisma.charge.findMany({
      where: overdueWhere,
      select: { studentId: true },
      distinct: ["studentId"],
    });

    return {
      totalPending: pendingCharges._count._all,
      totalOverdue: overdueCharges._count._all,
      totalPaid: paidCount,
      totalAmountOwed: (pendingCharges._sum.amount ?? 0) + (overdueCharges._sum.amount ?? 0),
      totalAmountCollected: paymentsThisMonth._sum.amount ?? 0,
      overdueStudentCount: overdueStudents.length,
    };
  }

  async createCharge(organizationId: string, actorId: string, dto: CreateChargeDto) {
    const { dueDate, ...rest } = dto;
    const charge = await this.prisma.charge.create({
      data: { ...rest, organizationId, dueDate: new Date(dueDate) },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "finance.charge_created",
      entityType: "Charge",
      entityId: charge.id,
      afterValue: charge as unknown as Prisma.InputJsonValue,
    });

    return charge;
  }

  async updateCharge(organizationId: string, actorId: string, id: string, dto: UpdateChargeDto) {
    const existing = await this.prisma.charge.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Charge not found");
    }

    const { dueDate, ...rest } = dto;
    const charge = await this.prisma.charge.update({
      where: { id },
      data: { ...rest, dueDate: dueDate ? new Date(dueDate) : undefined },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "finance.charge_updated",
      entityType: "Charge",
      entityId: charge.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: charge as unknown as Prisma.InputJsonValue,
    });

    return charge;
  }

  async removeCharge(organizationId: string, actorId: string, id: string) {
    const existing = await this.prisma.charge.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Charge not found");
    }
    await this.prisma.charge.delete({ where: { id } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "finance.charge_deleted",
      entityType: "Charge",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }

  // ---- Payments ----

  async findAllPayments(organizationId: string, filters: { periodStart?: string; periodEnd?: string } = {}) {
    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        // A payment matches a period filter when its own period overlaps the
        // requested range at all (not only when it's fully contained) — the
        // typical case is filtering by month while a payment's period spans
        // exactly that month.
        ...(filters.periodStart ? { periodEndDate: { gte: new Date(filters.periodStart) } } : {}),
        ...(filters.periodEnd ? { periodStartDate: { lte: new Date(filters.periodEnd) } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return this.withStudents(payments);
  }

  async findOnePayment(organizationId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id, organizationId } });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    const [withStudent] = await this.withStudents([payment]);
    return withStudent;
  }

  async createPayment(organizationId: string, actorId: string, dto: CreatePaymentDto) {
    if (dto.chargeId) {
      const charge = await this.prisma.charge.findFirst({ where: { id: dto.chargeId, organizationId } });
      if (!charge) {
        throw new NotFoundException("Charge not found");
      }
    }

    const { periodStartDate, periodEndDate, ...rest } = dto;

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          ...rest,
          organizationId,
          periodStartDate: periodStartDate ? new Date(periodStartDate) : undefined,
          periodEndDate: periodEndDate ? new Date(periodEndDate) : undefined,
        },
      });

      // A recorded payment moves the student into the "paid" lifecycle stage
      // (see Student.stage) — a lightweight funnel signal for the dashboard,
      // separate from the enrollment-status workflow.
      if (dto.amount > 0) {
        await tx.student.update({ where: { id: dto.studentId }, data: { stage: "paid" } });
      }

      await tx.financialTransaction.create({
        data: {
          organizationId,
          branchId: dto.branchId,
          financialAccountId: dto.financialAccountId,
          studentId: dto.studentId,
          type: "payment",
          direction: "credit",
          amount: dto.amount,
          currency: dto.currency ?? "UZS",
          referenceId: created.id,
          referenceType: "Payment",
        },
      });

      // This payment settles a specific charge — mark it paid in the same
      // transaction, so "Mark Paid" in the UI is atomic (never a payment
      // recorded with the charge still stuck pending, or vice versa).
      if (dto.chargeId) {
        await tx.charge.update({ where: { id: dto.chargeId }, data: { status: "paid" } });
      }

      return created;
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "finance.payment_created",
      entityType: "Payment",
      entityId: payment.id,
      afterValue: payment as unknown as Prisma.InputJsonValue,
    });

    return payment;
  }

  async updatePayment(organizationId: string, actorId: string, id: string, dto: UpdatePaymentDto) {
    const existing = await this.prisma.payment.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Payment not found");
    }

    const { periodStartDate, periodEndDate, ...rest } = dto;
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        ...rest,
        periodStartDate: periodStartDate === undefined ? undefined : periodStartDate === null ? null : new Date(periodStartDate),
        periodEndDate: periodEndDate === undefined ? undefined : periodEndDate === null ? null : new Date(periodEndDate),
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "finance.payment_updated",
      entityType: "Payment",
      entityId: payment.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: payment as unknown as Prisma.InputJsonValue,
    });

    return payment;
  }

  async removePayment(organizationId: string, actorId: string, id: string) {
    const existing = await this.prisma.payment.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Payment not found");
    }
    await this.prisma.payment.delete({ where: { id } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "finance.payment_deleted",
      entityType: "Payment",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }

  // ---- Dashboard aggregates ----

  /**
   * Feeds the dashboard's financial KPI row + expected-vs-actual chart.
   * "Monthly plan" is computed (never stored) as the sum of monthlyFee
   * across every currently-active group membership — i.e. what the org
   * would collect this month if every active student paid in full. This
   * mirrors the rest of finance.service.ts, which never persists derived
   * financial numbers.
   */
  async getDashboardStats(organizationId: string) {
    const now = new Date();
    const overdueWhere: Prisma.ChargeWhereInput = {
      organizationId,
      OR: [{ status: "overdue" }, { status: "pending", dueDate: { lt: now } }],
    };

    const [activeMemberships, collectedThisMonth, overdueCharges, overdueStudents] = await Promise.all([
      this.prisma.groupMembership.findMany({ where: { organizationId, status: "active" } }),
      this.prisma.payment.aggregate({
        where: { organizationId, createdAt: { gte: startOfMonth() } },
        _sum: { amount: true },
      }),
      this.prisma.charge.aggregate({ where: overdueWhere, _sum: { amount: true } }),
      this.prisma.charge.findMany({ where: overdueWhere, select: { studentId: true }, distinct: ["studentId"] }),
    ]);

    const groupIds = [...new Set(activeMemberships.map((m) => m.groupId))];
    const groups = groupIds.length ? await this.prisma.group.findMany({ where: { id: { in: groupIds } } }) : [];
    const groupById = new Map(groups.map((g) => [g.id, g]));
    const courseIds = [...new Set(groups.map((g) => g.courseId))];
    const courses = courseIds.length ? await this.prisma.course.findMany({ where: { id: { in: courseIds } } }) : [];
    const courseById = new Map(courses.map((c) => [c.id, c]));
    const DEFAULT_MONTHLY_FEE = 600_000;
    const monthlyPlan = activeMemberships.reduce((sum, m) => {
      const group = groupById.get(m.groupId);
      if (!group) return sum;
      const fee = group.monthlyFee ?? courseById.get(group.courseId)?.monthlyFee ?? DEFAULT_MONTHLY_FEE;
      return sum + fee;
    }, 0);

    // Expected vs actual for each of the last 6 months: "expected" is what
    // was billed (charges due that month), "actual" is what actually came in
    // (payments recorded that month) — both computed on read.
    const months: { start: Date; end: Date; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      months.push({ start, end, label: start.toLocaleDateString("en-US", { month: "short" }) });
    }
    const expectedVsActual = await Promise.all(
      months.map(async ({ start, end, label }) => {
        const [expected, actual] = await Promise.all([
          this.prisma.charge.aggregate({
            where: { organizationId, dueDate: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
          this.prisma.payment.aggregate({
            where: { organizationId, createdAt: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
        ]);
        return { month: label, expected: expected._sum.amount ?? 0, actual: actual._sum.amount ?? 0 };
      }),
    );

    return {
      monthlyPlan,
      collectedThisMonth: collectedThisMonth._sum.amount ?? 0,
      debtorsCount: overdueStudents.length,
      totalDebt: overdueCharges._sum.amount ?? 0,
      expectedVsActual,
    };
  }

  async getTodayReport(organizationId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayRange = { gte: todayStart, lte: todayEnd };

    const [
      revenueToday,
      newPaymentsToday,
      checkedInToday,
      lessonsHeldToday,
      newLeadsToday,
      newTrialsToday,
      newContractsToday,
      dismissedToday,
    ] = await Promise.all([
      this.prisma.payment.aggregate({ where: { organizationId, createdAt: todayRange }, _sum: { amount: true } }),
      this.prisma.payment.count({ where: { organizationId, createdAt: todayRange } }),
      this.prisma.attendance.findMany({
        where: { organizationId, date: todayRange, status: { in: ["present", "late"] } },
        select: { studentId: true },
        distinct: ["studentId"],
      }),
      this.prisma.lesson.findMany({
        where: { organizationId, date: todayRange },
        select: { groupId: true },
        distinct: ["groupId"],
      }),
      this.prisma.student.count({ where: { organizationId, createdAt: todayRange, stage: "lead" } }),
      this.prisma.student.count({ where: { organizationId, createdAt: todayRange, stage: "trial" } }),
      this.prisma.student.count({ where: { organizationId, convertedAt: todayRange } }),
      this.prisma.student.count({ where: { organizationId, status: { in: ["dropped", "archived"] }, updatedAt: todayRange } }),
    ]);

    return {
      revenueToday: revenueToday._sum.amount ?? 0,
      checkedInToday: checkedInToday.length,
      lessonsHeldToday: lessonsHeldToday.length,
      newLeadsToday,
      newTrialsToday,
      newContractsToday,
      newPaymentsToday,
      dismissedToday,
    };
  }

  // ---- Transactions (read-only, append-only) ----

  findAllTransactions(organizationId: string) {
    return this.prisma.financialTransaction.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }
}
