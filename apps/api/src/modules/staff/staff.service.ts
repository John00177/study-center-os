import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { IdentityService } from "../identity/identity.service";
import { generateTempPassword } from "../../common/utils/generate-temp-password";
import { CreateReceptionistDto } from "./dto/create-receptionist.dto";

const RECEPTIONIST_PERMISSION_SLUGS = [
  { slug: "reception.view", name: "View reception data" },
  { slug: "reception.manage", name: "Manage newcomers, students, and groups" },
  { slug: "finance.view", name: "View finance data" },
];

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly identityService: IdentityService,
  ) {}

  private async getOrCreateReceptionRole(organizationId: string) {
    const role = await this.prisma.role.upsert({
      where: { organizationId_slug: { organizationId, slug: "reception" } },
      update: {},
      create: { organizationId, name: "Reception", slug: "reception", isSystem: true },
    });

    for (const { slug, name } of RECEPTIONIST_PERMISSION_SLUGS) {
      const permission = await this.prisma.permission.upsert({ where: { slug }, update: {}, create: { slug, name } });
      await this.prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }

    return role;
  }

  // Receptionist accounts are plain Users + UserOrganizationRole — there's
  // no dedicated "Receptionist" profile table (unlike Teacher/Student), so
  // phone is accepted for form parity but not persisted or uniqueness-checked
  // — the schema has no phone column on User to check against.
  async createReceptionist(organizationId: string, actorId: string, dto: CreateReceptionistDto) {
    const existingUser = await this.identityService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException("A user with this email already exists");
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await this.identityService.hashPassword(tempPassword);
    const receptionRole = await this.getOrCreateReceptionRole(organizationId);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: passwordHash,
        status: "active",
        mustChangePassword: true,
        tempPassword,
      },
    });

    await this.prisma.userOrganizationRole.create({
      data: {
        userId: user.id,
        organizationId,
        roleId: receptionRole.id,
        status: "active",
        acceptedAt: new Date(),
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "receptionist.created",
      entityType: "User",
      entityId: user.id,
    });

    return { user: { id: user.id, name: user.name, email: user.email }, tempPassword };
  }

  /** Returns the temp password only while it's still unchanged — null once the account holder has changed it. */
  async getTempPassword(organizationId: string, userId: string) {
    const membership = await this.prisma.userOrganizationRole.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new NotFoundException("Staff member not found");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mustChangePassword: true, tempPassword: true },
    });
    return { tempPassword: user?.mustChangePassword ? (user.tempPassword ?? null) : null };
  }

  async resetPassword(organizationId: string, actorId: string, userId: string) {
    const membership = await this.prisma.userOrganizationRole.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new NotFoundException("Staff member not found");
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await this.identityService.hashPassword(tempPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash, mustChangePassword: true, tempPassword },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "staff.password_reset",
      entityType: "User",
      entityId: userId,
    });

    return { tempPassword };
  }

  async getStaffList(organizationId: string) {
    const memberships = await this.prisma.userOrganizationRole.findMany({
      where: { organizationId },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    });

    const userIds = memberships.map((m) => m.userId);
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
    const userById = new Map(users.map((u) => [u.id, u]));

    const branchAssignments = await this.prisma.staffBranchAssignment.findMany({
      where: { organizationId, userId: { in: userIds } },
    });
    const branchIds = [...new Set(branchAssignments.map((a) => a.branchId))];
    const branches = branchIds.length ? await this.prisma.branch.findMany({ where: { id: { in: branchIds } } }) : [];
    const branchById = new Map(branches.map((b) => [b.id, b]));
    const branchNameByUser = new Map<string, string>();
    for (const a of branchAssignments) {
      if (!branchNameByUser.has(a.userId)) {
        branchNameByUser.set(a.userId, branchById.get(a.branchId)?.name ?? "Unknown");
      }
    }

    const teacherRoleUserIds = memberships.filter((m) => m.role.slug === "teacher").map((m) => m.userId);
    const teachers = teacherRoleUserIds.length
      ? await this.prisma.teacher.findMany({ where: { organizationId, userId: { in: teacherRoleUserIds } } })
      : [];
    const teacherByUserId = new Map(teachers.map((t) => [t.userId!, t]));
    const teacherIds = teachers.map((t) => t.id);
    const dashboardAccess = teacherIds.length
      ? await this.prisma.teacherDashboardAccess.findMany({ where: { organizationId, teacherId: { in: teacherIds } } })
      : [];
    const accessByTeacherId = new Map(dashboardAccess.map((a) => [a.teacherId, a]));

    return memberships.map((membership) => {
      const user = userById.get(membership.userId);
      const teacher = teacherByUserId.get(membership.userId);
      const access = teacher ? accessByTeacherId.get(teacher.id) : undefined;

      return {
        userId: membership.userId,
        name: user?.name ?? "Unknown",
        email: user?.email ?? "",
        roleSlug: membership.role.slug,
        roleName: membership.role.name,
        branchName: branchNameByUser.get(membership.userId) ?? null,
        status: membership.status,
        teacherId: teacher?.id ?? null,
        dashboardAccessStatus: teacher ? access?.status ?? "not_activated" : null,
        mustChangePassword: user?.mustChangePassword ?? false,
      };
    });
  }

  async suspendMember(organizationId: string, actorId: string, userId: string) {
    return this.setMemberStatus(organizationId, actorId, userId, "suspended");
  }

  async activateMember(organizationId: string, actorId: string, userId: string) {
    return this.setMemberStatus(organizationId, actorId, userId, "active");
  }

  private async setMemberStatus(
    organizationId: string,
    actorId: string,
    userId: string,
    status: "active" | "suspended",
  ) {
    const membership = await this.prisma.userOrganizationRole.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new NotFoundException("Staff member not found");
    }

    const updated = await this.prisma.userOrganizationRole.update({
      where: { id: membership.id },
      data: {
        status,
        suspendedAt: status === "suspended" ? new Date() : null,
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: status === "suspended" ? "staff.suspended" : "staff.activated",
      entityType: "UserOrganizationRole",
      entityId: updated.id,
      metadata: { userId },
    });

    return updated;
  }
}
