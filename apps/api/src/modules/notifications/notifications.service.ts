import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterPushTokenDto } from "./dto/register-push-token.dto";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { SendNotificationDto } from "./dto/send-notification.dto";

const DEFAULT_PAGE_SIZE = 20;

export interface NotifyData {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  entityType?: string;
  entityId?: string;
}

export interface NotificationRecipient {
  id: string;
  name: string;
  /** "user" for staff, "student" for portal students — mirrors Notification.recipientType. */
  recipientType: "user" | "student";
  /** Shown as a grouping label in the recipient picker (e.g. "Teacher", "Reception"). */
  group: string;
}

export interface SenderContext {
  id: string;
  name: string;
  roleSlug: string;
  organizationId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // In-app notification feed (bell icon) — persisted, per-user. Distinct
  // from the mock push-token delivery below (registerPushToken/sendToUser/
  // notify), which targets a device rather than this list.
  // ---------------------------------------------------------------------

  async create(data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        recipientType: data.recipientType ?? "user",
        title: data.title,
        message: data.message,
        type: data.type ?? "info",
        entityType: data.entityType,
        entityId: data.entityId,
        senderId: data.senderId,
        senderName: data.senderName,
      },
    });
  }

  async findAll(userId: string, page = 1, limit = DEFAULT_PAGE_SIZE, recipientType: "user" | "student" = "user") {
    const skip = (page - 1) * limit;
    const where = { userId, recipientType };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  async markAsRead(id: string, userId: string, recipientType: "user" | "student" = "user") {
    const existing = await this.prisma.notification.findFirst({ where: { id, userId, recipientType } });
    if (!existing) {
      throw new NotFoundException("Notification not found");
    }
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllAsRead(userId: string, recipientType: "user" | "student" = "user") {
    const result = await this.prisma.notification.updateMany({
      where: { userId, recipientType, read: false },
      data: { read: true },
    });
    return { updatedCount: result.count };
  }

  async delete(id: string, userId: string, recipientType: "user" | "student" = "user") {
    const existing = await this.prisma.notification.findFirst({ where: { id, userId, recipientType } });
    if (!existing) {
      throw new NotFoundException("Notification not found");
    }
    await this.prisma.notification.delete({ where: { id } });
    return { id };
  }

  async deleteAll(userId: string, recipientType: "user" | "student" = "user") {
    const result = await this.prisma.notification.deleteMany({ where: { userId, recipientType } });
    return { deletedCount: result.count };
  }

  async getUnreadCount(userId: string, recipientType: "user" | "student" = "user") {
    const count = await this.prisma.notification.count({ where: { userId, recipientType, read: false } });
    return { count };
  }

  // ---------------------------------------------------------------------
  // Person-to-person sends. Each role may only notify the tier below it:
  // owner/admin -> teachers + reception, reception -> teachers,
  // teacher -> the students in their own assigned groups.
  // ---------------------------------------------------------------------

  /** Teachers of an org that have a linked User account (only those can receive in-app notifications). */
  private async teacherRecipients(organizationId: string): Promise<NotificationRecipient[]> {
    const teachers = await this.prisma.teacher.findMany({
      where: { organizationId, userId: { not: null } },
      select: { userId: true, name: true },
      orderBy: { name: "asc" },
    });
    return teachers.map((t) => ({ id: t.userId!, name: t.name, recipientType: "user" as const, group: "Teacher" }));
  }

  private async staffRecipientsByRole(organizationId: string, roleSlugs: string[], label: string) {
    const memberships = await this.prisma.userOrganizationRole.findMany({
      where: { organizationId, status: "active", role: { slug: { in: roleSlugs } } },
      select: { userId: true },
    });
    const userIds = [...new Set(memberships.map((m) => m.userId))];
    if (userIds.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return users.map((u) => ({ id: u.id, name: u.name, recipientType: "user" as const, group: label }));
  }

  /** Students enrolled in any group the given teacher-user is actively assigned to. */
  private async studentRecipientsForTeacher(organizationId: string, teacherUserId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { organizationId, userId: teacherUserId } });
    if (!teacher) return [];

    const assignments = await this.prisma.groupTeacherAssignment.findMany({
      where: { organizationId, teacherId: teacher.id, status: "active" },
      select: { groupId: true },
    });
    const groupIds = [...new Set(assignments.map((a) => a.groupId))];
    if (groupIds.length === 0) return [];

    const memberships = await this.prisma.groupMembership.findMany({
      where: { organizationId, groupId: { in: groupIds }, status: "active" },
      select: { studentId: true },
    });
    const studentIds = [...new Set(memberships.map((m) => m.studentId))];
    if (studentIds.length === 0) return [];

    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return students.map((s) => ({ id: s.id, name: s.name, recipientType: "student" as const, group: "Student" }));
  }

  /**
   * The set of people `sender` is allowed to notify. Also doubles as the
   * server-side allow-list for sendToRecipients — the client picker and the
   * write path are checked against the exact same query.
   */
  async getAllowedRecipients(sender: SenderContext): Promise<NotificationRecipient[]> {
    switch (sender.roleSlug) {
      case "owner":
      case "admin": {
        const [teachers, reception] = await Promise.all([
          this.teacherRecipients(sender.organizationId),
          this.staffRecipientsByRole(sender.organizationId, ["reception"], "Reception"),
        ]);
        return [...teachers, ...reception].filter((r) => r.id !== sender.id);
      }
      case "reception":
        return (await this.teacherRecipients(sender.organizationId)).filter((r) => r.id !== sender.id);
      case "teacher":
        return this.studentRecipientsForTeacher(sender.organizationId, sender.id);
      default:
        return [];
    }
  }

  async sendToRecipients(sender: SenderContext, dto: SendNotificationDto) {
    const allowed = await this.getAllowedRecipients(sender);
    const allowedById = new Map(allowed.map((r) => [r.id, r]));

    const targets = dto.recipientIds.map((id) => allowedById.get(id)).filter((r): r is NotificationRecipient => !!r);
    if (targets.length !== dto.recipientIds.length) {
      throw new ForbiddenException("One or more recipients are not available to you");
    }

    await this.prisma.notification.createMany({
      data: targets.map((target) => ({
        userId: target.id,
        recipientType: target.recipientType,
        title: dto.title,
        message: dto.message,
        type: dto.type ?? "info",
        senderId: sender.id,
        senderName: sender.name,
      })),
    });

    return { sentCount: targets.length };
  }

  /**
   * Notifies every active staff member of an org whose role matches one of
   * roleSlugs, skipping excludeUserId (the actor — see the "don't notify
   * yourself" rule the auto-trigger call sites follow). Used by
   * students/finance/attendance/salary services on their key events.
   */
  async notifyOrgStaff(
    organizationId: string,
    excludeUserId: string | undefined,
    roleSlugs: string[],
    data: NotifyData,
  ) {
    const memberships = await this.prisma.userOrganizationRole.findMany({
      where: { organizationId, status: "active", role: { slug: { in: roleSlugs } } },
    });
    const targetUserIds = [...new Set(memberships.map((m) => m.userId))].filter((id) => id !== excludeUserId);
    if (targetUserIds.length === 0) return;

    await this.prisma.notification.createMany({
      data: targetUserIds.map((userId) => ({
        userId,
        title: data.title,
        message: data.message,
        type: data.type ?? "info",
        entityType: data.entityType,
        entityId: data.entityId,
      })),
    });
  }

  /** Notifies every platform admin — used by support-tickets.service.ts on new feedback. */
  async notifyPlatformAdmins(data: NotifyData) {
    const admins = await this.prisma.user.findMany({ where: { isPlatformAdmin: true }, select: { id: true } });
    if (admins.length === 0) return;

    await this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: data.title,
        message: data.message,
        type: data.type ?? "info",
        entityType: data.entityType,
        entityId: data.entityId,
      })),
    });
  }

  // ---------------------------------------------------------------------
  // Overdue payment auto-notification.
  //
  // Overdue is computed on read throughout finance.service.ts (a pending
  // charge past its due date), never stored — so there is no status-change
  // event to hook. This daily sweep is the trigger instead, and
  // Charge.overdueNotifiedAt keeps it to one notification per charge.
  // ---------------------------------------------------------------------

  // Named explicitly: @nestjs/schedule falls back to crypto.randomUUID() for
  // unnamed jobs, which is not a global before Node 19 (Railway runs 18).
  @Cron(CronExpression.EVERY_DAY_AT_9AM, { name: "overdue-charge-sweep" })
  async sweepOverdueCharges() {
    const now = new Date();
    const charges = await this.prisma.charge.findMany({
      where: {
        overdueNotifiedAt: null,
        dueDate: { lt: now },
        OR: [{ status: "pending" }, { status: "overdue" }],
      },
      select: { id: true, organizationId: true, studentId: true, amount: true, currency: true },
    });
    if (charges.length === 0) return { notifiedCharges: 0 };

    const studentIds = [...new Set(charges.map((c) => c.studentId))];
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true },
    });
    const studentNameById = new Map(students.map((s) => [s.id, s.name]));

    // Recipients are per-org, and a sweep can span orgs — resolve each org's
    // teacher + reception audience once rather than per charge.
    const recipientsByOrg = new Map<string, string[]>();
    for (const organizationId of new Set(charges.map((c) => c.organizationId))) {
      const [teachers, reception] = await Promise.all([
        this.teacherRecipients(organizationId),
        this.staffRecipientsByRole(organizationId, ["reception"], "Reception"),
      ]);
      recipientsByOrg.set(organizationId, [...new Set([...teachers, ...reception].map((r) => r.id))]);
    }

    const rows = charges.flatMap((charge) => {
      const recipients = recipientsByOrg.get(charge.organizationId) ?? [];
      const studentName = studentNameById.get(charge.studentId) ?? "A student";
      return recipients.map((userId) => ({
        userId,
        recipientType: "user",
        title: "Payment overdue",
        message: `Student ${studentName} payment is overdue: ${charge.amount} ${charge.currency}`,
        type: "warning",
        entityType: "payment",
        entityId: charge.id,
      }));
    });

    if (rows.length > 0) {
      await this.prisma.notification.createMany({ data: rows });
    }
    // Stamped even when an org had no recipients, so a study center with no
    // staff accounts doesn't re-scan the same backlog every morning.
    await this.prisma.charge.updateMany({
      where: { id: { in: charges.map((c) => c.id) } },
      data: { overdueNotifiedAt: now },
    });

    this.logger.log(`Overdue sweep: ${charges.length} charge(s), ${rows.length} notification(s) created`);
    return { notifiedCharges: charges.length, notificationsCreated: rows.length };
  }

  // ---------------------------------------------------------------------
  // Mock push-token delivery (existing, unchanged) — targets a device via
  // Capacitor push registration, not the in-app feed above.
  // ---------------------------------------------------------------------

  async registerPushToken(userId: string, dto: RegisterPushTokenDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: dto.token, pushPlatform: dto.platform },
    });
  }

  /** Mock push send: no real Firebase/APNs wiring — logs what would be sent. */
  private mockSend(token: string, title: string, body: string) {
    this.logger.log(`[PUSH] To: ${token}, Title: ${title}, Body: ${body}`);
  }

  /** Sends to a registered app user (e.g. a teacher) if they have a push token on file. */
  async sendToUser(userId: string, title: string, body: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.pushToken) {
      this.logger.debug(`No push token on file for user ${userId}; skipping push "${title}"`);
      return;
    }
    this.mockSend(user.pushToken, title, body);
  }

  /**
   * Sends to a contact with no app account (e.g. a parent) — there is no
   * Parent<->push-token linkage in this schema yet, so this just mocks
   * delivery against a human-readable label instead of a device token.
   */
  notify(label: string, title: string, body: string) {
    this.mockSend(`contact:${label}`, title, body);
  }
}
