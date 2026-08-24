import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateParentDto } from "./dto/create-parent.dto";
import { UpdateParentDto } from "./dto/update-parent.dto";

@Injectable()
export class ParentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.parent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(organizationId: string, id: string) {
    const parent = await this.prisma.parent.findFirst({ where: { id, organizationId } });
    if (!parent) {
      throw new NotFoundException("Parent not found");
    }
    return parent;
  }

  async create(organizationId: string, actorId: string, dto: CreateParentDto) {
    const parent = await this.prisma.parent.create({ data: { ...dto, organizationId } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "parent.created",
      entityType: "Parent",
      entityId: parent.id,
      afterValue: parent as unknown as Prisma.InputJsonValue,
    });

    return parent;
  }

  async update(organizationId: string, actorId: string, id: string, dto: UpdateParentDto) {
    const existing = await this.findOne(organizationId, id);

    const parent = await this.prisma.parent.update({ where: { id }, data: dto });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "parent.updated",
      entityType: "Parent",
      entityId: parent.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: parent as unknown as Prisma.InputJsonValue,
    });

    return parent;
  }

  async remove(organizationId: string, actorId: string, id: string) {
    const existing = await this.findOne(organizationId, id);

    await this.prisma.parent.delete({ where: { id } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "parent.deleted",
      entityType: "Parent",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }
}
