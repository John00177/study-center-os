import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { IdentityService } from "../identity/identity.service";
import { TeachersService } from "../teachers/teachers.service";
import { generateTempPassword } from "../../common/utils/generate-temp-password";
import { generateStaffEmail } from "../../common/utils/generate-staff-email";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";

// "manager" in the UI maps to the existing "admin" role slug — that's the
// real elevated-permission tier already wired through every PermissionGuard
// check in the app; a distinct "manager" role has no permission plumbing
// anywhere, so introducing one would just create a role nothing recognizes.
const ROLE_CONFIG: Record<"reception" | "manager", { slug: string; name: string; permissionSlugs: { slug: string; name: string }[] }> = {
  reception: {
    slug: "reception",
    name: "Reception",
    permissionSlugs: [
      { slug: "reception.view", name: "View reception data" },
      { slug: "reception.manage", name: "Manage newcomers, students, and groups" },
      { slug: "finance.view", name: "View finance data" },
    ],
  },
  manager: { slug: "admin", name: "Admin", permissionSlugs: [] },
};

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly identityService: IdentityService,
    private readonly teachersService: TeachersService,
  ) {}

  private async getOrCreateRole(organizationId: string, kind: "reception" | "manager") {
    const config = ROLE_CONFIG[kind];
    const role = await this.prisma.role.upsert({
      where: { organizationId_slug: { organizationId, slug: config.slug } },
      update: {},
      create: { organizationId, name: config.name, slug: config.slug, isSystem: true },
    });

    for (const { slug, name } of config.permissionSlugs) {
      const permission = await this.prisma.permission.upsert({ where: { slug }, update: {}, create: { slug, name } });
      await this.prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }

    return role;
  }

  /**
   * Unified entry point for every staff type. Teacher creation delegates to
   * TeachersService (which owns the Teacher profile table and dashboard
   * access row) so that logic isn't duplicated; reception/manager are plain
   * User + UserOrganizationRole and are handled directly here.
   */
  async createStaffMember(organizationId: string, actorId: string, dto: CreateStaffDto) {
    if (dto.role === "teacher") {
      const result = await this.teachersService.create(organizationId, actorId, {
        name: dto.name,
        phone: dto.phone,
      });
      return {
        user: { id: result.teacher.userId!, name: result.teacher.name, email: result.teacher.email! },
        tempPassword: result.tempPassword,
      };
    }

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { slug: true } });
    const email = await generateStaffEmail(this.prisma, dto.name, org.slug);

    const tempPassword = generateTempPassword();
    const passwordHash = await this.identityService.hashPassword(tempPassword);
    const role = await this.getOrCreateRole(organizationId, dto.role);

    const user = await this.prisma.user.create({
      data: {
        email,
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
        roleId: role.id,
        status: "active",
        acceptedAt: new Date(),
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "staff.created",
      entityType: "User",
      entityId: user.id,
      metadata: { role: dto.role },
    });

    return { user: { id: user.id, name: user.name, email: user.email }, tempPassword };
  }

  async updateStaffMember(organizationId: string, actorId: string, userId: string, dto: UpdateStaffDto) {
    const membership = await this.prisma.userOrganizationRole.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new NotFoundException("Staff member not found");
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
    });

    if (dto.phone !== undefined) {
      // Only teachers have a phone field on their own profile row.
      await this.prisma.teacher.updateMany({ where: { organizationId, userId }, data: { phone: dto.phone } });
    }

    await this.auditService.record({
      organizationId,
      actorId,
      action: "staff.updated",
      entityType: "User",
      entityId: userId,
    });

    return { id: user.id, name: user.name, email: user.email };
  }

  /**
   * Removing a staff member unlinks them from the org (and deletes their
   * Teacher profile, if any) rather than hard-deleting the User row —
   * AuditLog.actorId has no cascade, so a user who has ever acted on
   * anything can't be physically deleted without breaking that history.
   * The account also stops being able to sign in (status: suspended).
   */
  async deleteStaffMember(organizationId: string, actorId: string, userId: string) {
    const membership = await this.prisma.userOrganizationRole.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { role: true },
    });
    if (!membership) {
      throw new NotFoundException("Staff member not found");
    }
    if (membership.role.slug === "owner") {
      throw new ForbiddenException("Cannot remove the organization owner");
    }

    await this.prisma.teacher.deleteMany({ where: { organizationId, userId } });
    await this.prisma.userOrganizationRole.delete({ where: { id: membership.id } });
    await this.prisma.user.update({ where: { id: userId }, data: { status: "suspended" } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "staff.removed",
      entityType: "User",
      entityId: userId,
    });

    return { id: userId };
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
      const phone = teacher?.phone ?? null;

      return {
        userId: membership.userId,
        name: user?.name ?? "Unknown",
        email: user?.email ?? "",
        phone,
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
