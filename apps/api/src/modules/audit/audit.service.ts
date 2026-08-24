import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

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
}
