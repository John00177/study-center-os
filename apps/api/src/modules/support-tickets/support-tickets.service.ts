import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TicketPriority, TicketStatus, TicketType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";

export interface SubmitterContext {
  submitterType: string;
  submitterId: string;
  submitterName: string;
  organizationId: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

const STAFF_SUBMITTER_TYPES = ["owner", "admin", "reception", "teacher"];

export interface TicketListFilters {
  status?: string;
  type?: string;
  priority?: string;
  organizationId?: string;
  search?: string;
}

@Injectable()
export class SupportTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createTicket(dto: CreateTicketDto, context: SubmitterContext) {
    if (!dto.contactEmail && !dto.contactPhone && !context.contactEmail && !context.contactPhone) {
      throw new ForbiddenException("At least one contact method (email or phone) is required");
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        contactName: context.submitterName,
        contactEmail: dto.contactEmail ?? context.contactEmail ?? undefined,
        contactPhone: dto.contactPhone ?? context.contactPhone ?? undefined,
        priority: dto.type === "issue" ? (dto.priority ?? "medium") : "medium",
        submitterType: context.submitterType,
        submitterId: context.submitterId,
        submitterName: context.submitterName,
        organizationId: context.organizationId,
      },
    });

    const org = context.organizationId
      ? await this.prisma.organization.findUnique({ where: { id: context.organizationId }, select: { name: true } })
      : null;
    await this.notificationsService.notifyPlatformAdmins({
      title: "New feedback",
      message: `New feedback from ${org?.name ?? context.submitterName}`,
      type: "info",
      entityType: "support_ticket",
      entityId: ticket.id,
    });

    return ticket;
  }

  private async withOrganizationNames<T extends { organizationId: string | null }>(tickets: T[]) {
    const orgIds = [...new Set(tickets.map((t) => t.organizationId).filter((id): id is string => !!id))];
    const orgs = orgIds.length ? await this.prisma.organization.findMany({ where: { id: { in: orgIds } } }) : [];
    const orgById = new Map(orgs.map((o) => [o.id, o]));
    return tickets.map((t) => ({
      ...t,
      organizationName: t.organizationId ? orgById.get(t.organizationId)?.name ?? "Unknown" : null,
    }));
  }

  private whereFromFilters(filters: TicketListFilters): Prisma.SupportTicketWhereInput {
    return {
      status: filters.status as TicketStatus | undefined,
      type: filters.type as TicketType | undefined,
      priority: filters.priority as TicketPriority | undefined,
      organizationId: filters.organizationId,
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" } },
              { description: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  }

  /** Platform admin view — every ticket across every org, plus platform-level ones (organizationId null). */
  async getAllTicketsForPlatformAdmin(filters: TicketListFilters) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: this.whereFromFilters(filters),
      orderBy: { createdAt: "desc" },
    });
    return this.withOrganizationNames(tickets);
  }

  /** Owner/admin view — scoped to their own org only, internal notes stripped (platform-admin-only field). */
  async getTicketsForOrganization(organizationId: string, filters: Omit<TicketListFilters, "organizationId">) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { ...this.whereFromFilters(filters), organizationId, visibleToOrg: true },
      orderBy: { createdAt: "desc" },
    });
    return tickets.map(({ internalNotes: _internalNotes, ...t }) => t);
  }

  async getMyTickets(submitterType: string, submitterId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { submitterType, submitterId },
      orderBy: { createdAt: "desc" },
    });
    return tickets.map(({ internalNotes: _internalNotes, ...t }) => t);
  }

  async getOpenTicketCount(submitterType: string, submitterId: string) {
    return this.prisma.supportTicket.count({
      where: { submitterType, submitterId, status: { in: ["open", "in_progress"] } },
    });
  }

  async getTicketByIdForPlatformAdmin(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
    const [withOrgName] = await this.withOrganizationNames([ticket]);
    return withOrgName;
  }

  async getTicketByIdForOrganization(id: string, organizationId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, organizationId } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
    const { internalNotes: _internalNotes, ...rest } = ticket;
    return rest;
  }

  async updateTicketAsPlatformAdmin(id: string, actorId: string, dto: UpdateTicketDto) {
    const existing = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Ticket not found");
    }
    const isNewReply = Boolean(dto.adminReply) && dto.adminReply !== existing.adminReply;
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: isNewReply ? { ...dto, repliedAt: new Date() } : dto,
    });

    // Only staff submitters are backed by a real User row (student/parent
    // portals have their own separate auth and no Notification feed).
    if (isNewReply && STAFF_SUBMITTER_TYPES.includes(existing.submitterType)) {
      await this.notificationsService.create({
        userId: existing.submitterId,
        title: "Support ticket reply",
        message: `You have a reply on "${existing.title}"`,
        type: "info",
        entityType: "support_ticket",
        entityId: existing.id,
      });
    }

    // AuditLog.organizationId is a required FK, so platform-level tickets
    // (which have no organization) can't be audited into an org's log.
    if (existing.organizationId) {
      await this.auditService.record({
        organizationId: existing.organizationId,
        actorId,
        action: "support_ticket.updated",
        entityType: "SupportTicket",
        entityId: id,
        beforeValue: { status: existing.status, priority: existing.priority } as unknown as Prisma.InputJsonValue,
        afterValue: { status: updated.status, priority: updated.priority } as unknown as Prisma.InputJsonValue,
      });
    }

    return updated;
  }

  // Owner/admin can move status/priority but never see or write internal
  // notes (those are platform-admin-only per the spec) — silently dropped
  // rather than rejected, since the frontend never shows that field to them.
  async updateTicketAsOrganization(id: string, organizationId: string, actorId: string, dto: UpdateTicketDto) {
    const existing = await this.prisma.supportTicket.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Ticket not found");
    }
    // Org staff can move status/priority but never set internalNotes or
    // adminReply — those are platform-admin-only fields (see updateTicketAsPlatformAdmin).
    const { internalNotes: _internalNotes, adminReply: _adminReply, ...allowedDto } = dto;
    const updated = await this.prisma.supportTicket.update({ where: { id }, data: allowedDto });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "support_ticket.updated",
      entityType: "SupportTicket",
      entityId: id,
      beforeValue: { status: existing.status, priority: existing.priority } as unknown as Prisma.InputJsonValue,
      afterValue: { status: updated.status, priority: updated.priority } as unknown as Prisma.InputJsonValue,
    });

    const { internalNotes: _stripped, ...rest } = updated;
    return rest;
  }

  async bulkUpdateStatus(ids: string[], status: string, actorId: string, scope: { organizationId?: string } = {}) {
    const where: Prisma.SupportTicketWhereInput = scope.organizationId
      ? { id: { in: ids }, organizationId: scope.organizationId }
      : { id: { in: ids } };

    const result = await this.prisma.supportTicket.updateMany({ where, data: { status: status as TicketStatus } });

    // AuditLog.organizationId is a required FK — a platform-admin bulk update
    // spans organizations, so there is no single org log it belongs in.
    if (scope.organizationId) {
      await this.auditService.record({
        organizationId: scope.organizationId,
        actorId,
        action: "support_ticket.bulk_updated",
        entityType: "SupportTicket",
        entityId: ids.join(","),
        afterValue: { status, count: result.count } as unknown as Prisma.InputJsonValue,
      });
    }

    return { updatedCount: result.count };
  }

  async getSummary(organizationId?: string) {
    const where: Prisma.SupportTicketWhereInput = organizationId ? { organizationId } : {};
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const [totalOpen, totalToday, totalThisWeek] = await Promise.all([
      this.prisma.supportTicket.count({ where: { ...where, status: { in: ["open", "in_progress"] } } }),
      this.prisma.supportTicket.count({ where: { ...where, createdAt: { gte: todayStart } } }),
      this.prisma.supportTicket.count({ where: { ...where, createdAt: { gte: weekStart } } }),
    ]);

    return { totalOpen, totalToday, totalThisWeek };
  }
}
