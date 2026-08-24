import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SubscriptionLimitsService } from "../subscription/subscription-limits.service";
import { slugify } from "../../common/utils/slugify";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly limitsService: SubscriptionLimitsService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(organizationId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id, organizationId } });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }
    return branch;
  }

  private async uniqueSlug(organizationId: string, name: string): Promise<string> {
    const base = slugify(name) || "branch";
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.branch.findUnique({ where: { organizationId_slug: { organizationId, slug: candidate } } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  async create(organizationId: string, actorId: string, dto: CreateBranchDto) {
    await this.limitsService.enforceLimit(organizationId, "branch");
    const slug = await this.uniqueSlug(organizationId, dto.name);

    const branch = await this.prisma.branch.create({
      data: { ...dto, organizationId, slug },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "branch.created",
      entityType: "Branch",
      entityId: branch.id,
      afterValue: branch as unknown as Prisma.InputJsonValue,
    });

    return branch;
  }

  async update(organizationId: string, actorId: string, id: string, dto: UpdateBranchDto) {
    const existing = await this.findOne(organizationId, id);

    const branch = await this.prisma.branch.update({
      where: { id },
      data: dto,
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "branch.updated",
      entityType: "Branch",
      entityId: branch.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: branch as unknown as Prisma.InputJsonValue,
    });

    return branch;
  }

  async remove(organizationId: string, actorId: string, id: string) {
    const existing = await this.findOne(organizationId, id);

    await this.prisma.branch.delete({ where: { id } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "branch.deleted",
      entityType: "Branch",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }
}
