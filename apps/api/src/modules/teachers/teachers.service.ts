import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { IdentityService } from "../identity/identity.service";
import { SubscriptionLimitsService } from "../subscription/subscription-limits.service";
import { generateTempPassword } from "../../common/utils/generate-temp-password";
import { generateStaffEmail } from "../../common/utils/generate-staff-email";
import { CreateTeacherDto } from "./dto/create-teacher.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly limitsService: SubscriptionLimitsService,
    private readonly identityService: IdentityService,
  ) {}

  private async getOrCreateTeacherRole(organizationId: string) {
    return this.prisma.role.upsert({
      where: { organizationId_slug: { organizationId, slug: "teacher" } },
      update: {},
      create: { organizationId, name: "Teacher", slug: "teacher", isSystem: true },
    });
  }

  private async withDerivedFields(organizationId: string, teacherIds: string[]) {
    const [accessRows, assignments] = await Promise.all([
      this.prisma.teacherDashboardAccess.findMany({
        where: { organizationId, teacherId: { in: teacherIds } },
      }),
      this.prisma.groupTeacherAssignment.findMany({
        where: { organizationId, teacherId: { in: teacherIds }, status: "active" },
        select: { teacherId: true, groupId: true },
      }),
    ]);

    const accessByTeacher = new Map(accessRows.map((row) => [row.teacherId, row]));

    const groupIds = [...new Set(assignments.map((a) => a.groupId))];
    const membershipCounts = groupIds.length
      ? await this.prisma.groupMembership.groupBy({
          by: ["groupId"],
          where: { organizationId, groupId: { in: groupIds }, status: "active" },
          _count: { groupId: true },
        })
      : [];
    const studentCountByGroup = new Map(membershipCounts.map((row) => [row.groupId, row._count.groupId]));

    const groupCountByTeacher = new Map<string, number>();
    const studentCountByTeacher = new Map<string, number>();
    for (const a of assignments) {
      groupCountByTeacher.set(a.teacherId, (groupCountByTeacher.get(a.teacherId) ?? 0) + 1);
      studentCountByTeacher.set(
        a.teacherId,
        (studentCountByTeacher.get(a.teacherId) ?? 0) + (studentCountByGroup.get(a.groupId) ?? 0),
      );
    }

    return { accessByTeacher, groupCountByTeacher, studentCountByTeacher };
  }

  async findAll(organizationId: string) {
    const teachers = await this.prisma.teacher.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    const { accessByTeacher, groupCountByTeacher, studentCountByTeacher } = await this.withDerivedFields(
      organizationId,
      teachers.map((t) => t.id),
    );

    const userIds = teachers.map((t) => t.userId).filter((id): id is string => !!id);
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, mustChangePassword: true } })
      : [];
    const mustChangeByUserId = new Map(users.map((u) => [u.id, u.mustChangePassword]));

    return teachers.map((teacher) => ({
      ...teacher,
      dashboardStatus: accessByTeacher.get(teacher.id)?.status ?? "not_activated",
      activeGroupCount: groupCountByTeacher.get(teacher.id) ?? 0,
      activeStudentCount: studentCountByTeacher.get(teacher.id) ?? 0,
      mustChangePassword: teacher.userId ? (mustChangeByUserId.get(teacher.userId) ?? false) : false,
    }));
  }

  /**
   * A teacher's assigned groups aren't stored on the Teacher itself, so
   * they're resolved via GroupTeacherAssignment -> Group -> Course (same
   * manual-join pattern used throughout this codebase).
   */
  private async withGroupsList(organizationId: string, teacherId: string) {
    const assignments = await this.prisma.groupTeacherAssignment.findMany({
      where: { organizationId, teacherId, status: "active" },
    });
    const groupIds = [...new Set(assignments.map((a) => a.groupId))];
    const groups = groupIds.length
      ? await this.prisma.group.findMany({ where: { id: { in: groupIds } }, include: { branch: true } })
      : [];
    const courseIds = [...new Set(groups.map((g) => g.courseId))];
    const courses = courseIds.length ? await this.prisma.course.findMany({ where: { id: { in: courseIds } } }) : [];
    const courseById = new Map(courses.map((c) => [c.id, c]));

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      courseName: courseById.get(g.courseId)?.name ?? null,
      branchName: g.branch?.name ?? null,
    }));
  }

  async findOne(organizationId: string, id: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id, organizationId } });
    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    const { accessByTeacher, groupCountByTeacher, studentCountByTeacher } = await this.withDerivedFields(organizationId, [id]);
    const groups = await this.withGroupsList(organizationId, id);

    return {
      ...teacher,
      dashboardStatus: accessByTeacher.get(id)?.status ?? "not_activated",
      activeGroupCount: groupCountByTeacher.get(id) ?? 0,
      activeStudentCount: studentCountByTeacher.get(id) ?? 0,
      groups,
    };
  }

  // Owner/admin creating a teacher creates the whole login-capable account in
  // one step — a User with a generated temp password, the Teacher profile,
  // org membership, optional group assignments, and active dashboard access
  // — rather than the old flow of a bare Teacher record activated later.
  async create(organizationId: string, actorId: string, dto: CreateTeacherDto) {
    // This flow creates dashboard access as part of the same transaction
    // (not via activateDashboardAccess), so the plan limit has to be
    // enforced up front here too.
    await this.limitsService.enforceLimit(organizationId, "teacher");

    const { groupIds, ...teacherFields } = dto;

    if (dto.phone) {
      const phoneTaken = await this.prisma.teacher.findFirst({ where: { phone: dto.phone } });
      if (phoneTaken) {
        throw new ConflictException("A user with this phone number already exists");
      }
    }

    let email = dto.email;
    if (email) {
      const existingUser = await this.identityService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException("A user with this email already exists");
      }
    } else {
      const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { slug: true } });
      email = await generateStaffEmail(this.prisma, dto.name, org.slug);
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await this.identityService.hashPassword(tempPassword);
    const teacherRole = await this.getOrCreateTeacherRole(organizationId);

    const groups = groupIds?.length
      ? await this.prisma.group.findMany({ where: { id: { in: groupIds }, organizationId } })
      : [];

    const { teacher, user } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: dto.name,
          password: passwordHash,
          status: "active",
          mustChangePassword: true,
          tempPassword,
        },
      });

      const teacher = await tx.teacher.create({
        data: { ...teacherFields, email, organizationId, userId: user.id },
      });

      await tx.userOrganizationRole.create({
        data: {
          userId: user.id,
          organizationId,
          roleId: teacherRole.id,
          status: "active",
          acceptedAt: new Date(),
        },
      });

      for (const group of groups) {
        await tx.groupTeacherAssignment.create({
          data: {
            organizationId,
            branchId: group.branchId,
            groupId: group.id,
            teacherId: teacher.id,
            startDate: new Date(),
            status: "active",
            assignedBy: actorId,
          },
        });
      }

      await tx.teacherDashboardAccess.create({
        data: {
          organizationId,
          teacherId: teacher.id,
          status: "active",
          activatedBy: actorId,
          activatedAt: new Date(),
        },
      });

      return { teacher, user };
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "teacher.created",
      entityType: "Teacher",
      entityId: teacher.id,
      afterValue: teacher as unknown as Prisma.InputJsonValue,
    });

    return { teacher: { ...teacher, mustChangePassword: user.mustChangePassword }, tempPassword };
  }

  async update(organizationId: string, actorId: string, id: string, dto: UpdateTeacherDto) {
    const existing = await this.prisma.teacher.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Teacher not found");
    }

    const teacher = await this.prisma.teacher.update({ where: { id }, data: dto });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "teacher.updated",
      entityType: "Teacher",
      entityId: teacher.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: teacher as unknown as Prisma.InputJsonValue,
    });

    return teacher;
  }

  async remove(organizationId: string, actorId: string, id: string) {
    const existing = await this.prisma.teacher.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Teacher not found");
    }

    await this.prisma.teacher.delete({ where: { id } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "teacher.deleted",
      entityType: "Teacher",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }

  /** Returns the temp password only while it's still unchanged — null once the account holder has changed it. */
  async getTempPassword(organizationId: string, teacherId: string) {
    const teacher = await this.findOne(organizationId, teacherId);
    if (!teacher.userId) {
      return { tempPassword: null };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: teacher.userId },
      select: { mustChangePassword: true, tempPassword: true },
    });
    return { tempPassword: user?.mustChangePassword ? (user.tempPassword ?? null) : null };
  }

  async resetPassword(organizationId: string, actorId: string, teacherId: string) {
    const teacher = await this.findOne(organizationId, teacherId);
    if (!teacher.userId) {
      throw new NotFoundException("This teacher has no login account");
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await this.identityService.hashPassword(tempPassword);
    await this.prisma.user.update({
      where: { id: teacher.userId },
      data: { password: passwordHash, mustChangePassword: true, tempPassword },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "teacher.password_reset",
      entityType: "Teacher",
      entityId: teacherId,
    });

    return { tempPassword };
  }

  private async getOrCreateAccess(organizationId: string, teacherId: string) {
    const existing = await this.prisma.teacherDashboardAccess.findFirst({
      where: { organizationId, teacherId },
    });
    if (existing) return existing;
    return this.prisma.teacherDashboardAccess.create({
      data: { organizationId, teacherId, status: "not_activated" },
    });
  }

  async activateDashboardAccess(organizationId: string, actorId: string, teacherId: string) {
    await this.findOne(organizationId, teacherId);
    const access = await this.getOrCreateAccess(organizationId, teacherId);
    // Only enforce when actually turning access on — re-activating an
    // already-active teacher (a no-op update) shouldn't count twice, and
    // suspending is never limited by plan.
    if (access.status !== "active") {
      await this.limitsService.enforceLimit(organizationId, "teacher");
    }
    const now = new Date();

    const updated = await this.prisma.teacherDashboardAccess.update({
      where: { id: access.id },
      data: {
        status: "active",
        activatedBy: actorId,
        activatedAt: now,
        lastChangedBy: actorId,
        lastChangedAt: now,
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "teacher.dashboard_access.activated",
      entityType: "Teacher",
      entityId: teacherId,
      afterValue: updated as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async suspendDashboardAccess(organizationId: string, actorId: string, teacherId: string) {
    await this.findOne(organizationId, teacherId);
    const access = await this.getOrCreateAccess(organizationId, teacherId);
    const now = new Date();

    const updated = await this.prisma.teacherDashboardAccess.update({
      where: { id: access.id },
      data: {
        status: "suspended",
        suspendedBy: actorId,
        suspendedAt: now,
        lastChangedBy: actorId,
        lastChangedAt: now,
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "teacher.dashboard_access.suspended",
      entityType: "Teacher",
      entityId: teacherId,
      afterValue: updated as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }
}
