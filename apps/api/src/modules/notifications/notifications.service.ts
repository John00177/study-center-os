import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterPushTokenDto } from "./dto/register-push-token.dto";
import { CreateNotificationDto } from "./dto/create-notification.dto";

const DEFAULT_PAGE_SIZE = 20;

export interface NotifyData {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  entityType?: string;
  entityId?: string;
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
        title: data.title,
        message: data.message,
        type: data.type ?? "info",
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
  }

  async findAll(userId: string, page = 1, limit = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  async markAsRead(id: string, userId: string) {
    const existing = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new NotFoundException("Notification not found");
    }
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { updatedCount: result.count };
  }

  async delete(id: string, userId: string) {
    const existing = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new NotFoundException("Notification not found");
    }
    await this.prisma.notification.delete({ where: { id } });
    return { id };
  }

  async deleteAll(userId: string) {
    const result = await this.prisma.notification.deleteMany({ where: { userId } });
    return { deletedCount: result.count };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, read: false } });
    return { count };
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
