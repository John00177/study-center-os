import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, ReminderType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OverdueChargesQueryDto } from "./dto/overdue-charges-query.dto";
import { SendReminderDto } from "./dto/send-reminder.dto";

const MONTH_NAMES_UZ = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentyabr",
  "oktyabr",
  "noyabr",
  "dekabr",
];

function daysBetween(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / msPerDay));
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getOverdueCharges(organizationId: string, filters: OverdueChargesQueryDto) {
    const now = new Date();
    const charges = await this.prisma.charge.findMany({
      where: {
        organizationId,
        status: { in: ["pending", "overdue"] },
        dueDate: { lt: now },
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
      orderBy: { dueDate: "asc" },
    });

    const studentIds = [...new Set(charges.map((c) => c.studentId))];
    const students = await this.prisma.student.findMany({ where: { id: { in: studentIds } } });
    const studentById = new Map(students.map((s) => [s.id, s]));

    const chargeIds = charges.map((c) => c.id);
    const lastReminders = await this.prisma.reminder.findMany({
      where: { organizationId, chargeId: { in: chargeIds } },
      orderBy: { createdAt: "desc" },
    });
    const lastReminderByCharge = new Map<string, (typeof lastReminders)[number]>();
    for (const reminder of lastReminders) {
      if (!lastReminderByCharge.has(reminder.chargeId)) {
        lastReminderByCharge.set(reminder.chargeId, reminder);
      }
    }

    return charges
      .map((charge) => ({
        ...charge,
        student: studentById.get(charge.studentId) ?? null,
        daysOverdue: daysBetween(charge.dueDate, now),
        lastReminder: lastReminderByCharge.get(charge.id) ?? null,
      }))
      .filter((charge) => (filters.minDaysOverdue ? charge.daysOverdue >= filters.minDaysOverdue : true));
  }

  private buildMessage(input: {
    parentName: string;
    studentName: string;
    amount: number;
    currency: string;
    dueDate: Date;
    orgName: string;
  }) {
    const month = MONTH_NAMES_UZ[input.dueDate.getMonth()];
    const dueDateStr = input.dueDate.toLocaleDateString("uz-UZ");
    return `Assalomu alaykum ${input.parentName}! ${input.studentName}ning ${month} oyi uchun ${input.amount.toLocaleString("uz-UZ")} ${input.currency} to'lov muddati ${dueDateStr}da tugagan. Iltimos, to'lovni amalga oshiring. Rahmat! — ${input.orgName}`;
  }

  private async mockDeliver(reminderId: string, phone: string, type: ReminderType) {
    const label = type.toUpperCase();
    this.logger.log(`[MOCK ${label}] To: ${phone}`);

    setTimeout(() => {
      this.prisma.reminder
        .update({ where: { id: reminderId }, data: { status: "sent", sentAt: new Date() } })
        .catch((err) => this.logger.error(`Failed to mark reminder ${reminderId} as sent`, err));

      setTimeout(() => {
        this.prisma.reminder
          .update({ where: { id: reminderId }, data: { status: "delivered", deliveredAt: new Date() } })
          .catch((err) => this.logger.error(`Failed to mark reminder ${reminderId} as delivered`, err));
      }, 2000);
    }, 2000);
  }

  async sendReminder(organizationId: string, actorId: string, dto: SendReminderDto) {
    const charge = await this.prisma.charge.findFirst({ where: { id: dto.chargeId, organizationId } });
    if (!charge) {
      throw new NotFoundException("Charge not found");
    }

    const student = await this.prisma.student.findFirst({ where: { id: charge.studentId, organizationId } });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    if (!student.phone) {
      throw new BadRequestException("Student has no phone number on file");
    }

    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    const parentName = student.emergencyContact?.trim() || "ota-ona";
    const content = this.buildMessage({
      parentName,
      studentName: student.name,
      amount: charge.amount,
      currency: charge.currency,
      dueDate: charge.dueDate,
      orgName: organization.name,
    });

    const reminder = await this.prisma.reminder.create({
      data: {
        organizationId,
        chargeId: charge.id,
        studentId: student.id,
        type: dto.type,
        status: "pending",
        content,
        createdById: actorId,
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "reminders.reminder_sent",
      entityType: "Reminder",
      entityId: reminder.id,
      afterValue: reminder as unknown as Prisma.InputJsonValue,
    });

    void this.mockDeliver(reminder.id, student.phone, dto.type);
    this.notificationsService.notify(
      parentName === "ota-ona" ? student.name : parentName,
      "Payment reminder sent",
      `A reminder for ${student.name}'s charge was just sent.`,
    );

    return reminder;
  }

  async getReminderHistory(organizationId: string, studentId?: string) {
    const reminders = await this.prisma.reminder.findMany({
      where: { organizationId, ...(studentId ? { studentId } : {}) },
      orderBy: { createdAt: "desc" },
    });

    const studentIds = [...new Set(reminders.map((r) => r.studentId))];
    const chargeIds = [...new Set(reminders.map((r) => r.chargeId))];
    const [students, charges] = await Promise.all([
      this.prisma.student.findMany({ where: { id: { in: studentIds } } }),
      this.prisma.charge.findMany({ where: { id: { in: chargeIds } } }),
    ]);
    const studentById = new Map(students.map((s) => [s.id, s]));
    const chargeById = new Map(charges.map((c) => [c.id, c]));

    return reminders.map((reminder) => ({
      ...reminder,
      student: studentById.get(reminder.studentId) ?? null,
      charge: chargeById.get(reminder.chargeId) ?? null,
    }));
  }

  async getReminderStats(organizationId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const remindersThisMonth = await this.prisma.reminder.findMany({
      where: { organizationId, createdAt: { gte: startOfMonth } },
    });

    const sent = remindersThisMonth.length;
    const delivered = remindersThisMonth.filter((r) => r.status === "delivered").length;
    const failed = remindersThisMonth.filter((r) => r.status === "failed").length;
    const deliveryRate = sent > 0 ? delivered / sent : 0;

    const remindedChargeIds = [...new Set(remindersThisMonth.map((r) => r.chargeId))];
    const paidCharges = remindedChargeIds.length
      ? await this.prisma.charge.findMany({
          where: { organizationId, id: { in: remindedChargeIds }, status: "paid" },
        })
      : [];
    const conversionRate = remindedChargeIds.length ? paidCharges.length / remindedChargeIds.length : 0;

    let totalDaysToPay = 0;
    let paidWithReminderCount = 0;
    for (const charge of paidCharges) {
      const firstReminder = remindersThisMonth
        .filter((r) => r.chargeId === charge.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      if (firstReminder) {
        totalDaysToPay += daysBetween(firstReminder.createdAt, charge.updatedAt);
        paidWithReminderCount += 1;
      }
    }
    const avgDaysToPay = paidWithReminderCount > 0 ? totalDaysToPay / paidWithReminderCount : null;

    return {
      sent,
      delivered,
      failed,
      conversionRate,
      avgDaysToPay,
    };
  }
}
