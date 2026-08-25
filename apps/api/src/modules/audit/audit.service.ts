import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryAuditLogDto } from "./dto/query-audit-log.dto";

// Many services pass the full Prisma row into beforeValue/afterValue,
// password hashes and all — harmless while audit logs were write-only, but
// this is the read path a UI now renders, so redact known secret fields
// before they ever leave the server.
const SENSITIVE_KEYS = new Set(["password", "parentPassword", "tempPassword"]);

export function redact(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      SENSITIVE_KEYS.has(key) && val != null ? "[redacted]" : val,
    ]),
  );
}

export interface RecordAuditEventInput {
  organizationId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue?: Prisma.InputJsonValue | null;
  afterValue?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEventInput) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeValue: input.beforeValue ?? Prisma.JsonNull,
        afterValue: input.afterValue ?? Prisma.JsonNull,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  }

  async list(organizationId: string, query: QueryAuditLogDto) {
    const where: Prisma.AuditLogWhereInput = { organizationId };

    if (query.verb) {
      where.action = { endsWith: `.${query.verb}` };
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.actorId) {
      where.actorId = query.actorId;
    }
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { actor: { select: { name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: rows.map(({ actor, beforeValue, afterValue, ...row }) => ({
        ...row,
        actorName: actor?.name ?? null,
        beforeValue: redact(beforeValue),
        afterValue: redact(afterValue),
      })),
      total,
    };
  }

  async findOne(organizationId: string, id: string) {
    const row = await this.prisma.auditLog.findFirst({
      where: { id, organizationId },
      include: { actor: { select: { name: true } } },
    });
    if (!row) {
      throw new NotFoundException("Audit log entry not found");
    }
    const { actor, beforeValue, afterValue, ...rest } = row;
    return {
      ...rest,
      actorName: actor?.name ?? null,
      beforeValue: redact(beforeValue),
      afterValue: redact(afterValue),
    };
  }

  /** Distinct entity types seen in this org's audit log — powers the filter dropdown. */
  async listEntityTypes(organizationId: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: { organizationId },
      select: { entityType: true },
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
    });
    return rows.map((r) => r.entityType);
  }
}
