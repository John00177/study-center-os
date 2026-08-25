import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService, redact } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SubscriptionLimitsService } from "../subscription/subscription-limits.service";
import { generateTempPassword } from "../../common/utils/generate-temp-password";
import { AddNoteDto } from "./dto/add-note.dto";
import { ConvertToActiveDto } from "./dto/convert-to-active.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { CreateStudentDirectDto } from "./dto/create-student-direct.dto";
import { LinkParentDto } from "./dto/link-parent.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly limitsService: SubscriptionLimitsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Strips the three secret-bearing fields before a Student row is ever
   * returned to a client. tempPassword in particular is stored in plaintext
   * (see the schema comment on Student.tempPassword) — it's meant to be
   * surfaced only through the dedicated, narrowly-scoped getTempPassword
   * endpoint below, never as a side effect of listing/reading students.
   */
  private omitSecrets<T extends { password: string | null; tempPassword: string | null; parentPassword: string | null }>(
    student: T,
  ): Omit<T, "password" | "tempPassword" | "parentPassword"> {
    const { password, tempPassword, parentPassword, ...safe } = student;
    return safe;
  }

  private async withEnrollmentStatus<
    T extends { id: string; password: string | null; tempPassword: string | null; parentPassword: string | null },
  >(organizationId: string, students: T[]) {
    const studentIds = students.map((s) => s.id);
    const activeMemberships = await this.prisma.groupMembership.groupBy({
      by: ["studentId"],
      where: { organizationId, studentId: { in: studentIds }, status: "active" },
      _count: { studentId: true },
    });
    const activeCountByStudent = new Map(activeMemberships.map((row) => [row.studentId, row._count.studentId]));

    return students.map((student) => ({
      ...this.omitSecrets(student),
      activeGroupCount: activeCountByStudent.get(student.id) ?? 0,
      enrollmentStatus: (activeCountByStudent.get(student.id) ?? 0) > 0 ? "enrolled" : "not_enrolled",
    }));
  }

  // The main roster: active students only. Newcomers, dropped, and archived
  // students each have their own dedicated list (getNewcomers/getArchivedStudents)
  // and must never leak into this one.
  async findAll(organizationId: string) {
    const students = await this.prisma.student.findMany({
      where: { organizationId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
    return this.withEnrollmentStatus(organizationId, students);
  }

  async findOne(organizationId: string, id: string) {
    const student = await this.prisma.student.findFirst({ where: { id, organizationId } });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    const [withStatus] = await this.withEnrollmentStatus(organizationId, [student]);
    return withStatus;
  }

  /**
   * Powers the tabbed Student Profile page. Student has no formal Prisma
   * relations to GroupMembership/AuditLog (see finance.service.ts's
   * withStudents/withGroups for the same pattern elsewhere), so groups and
   * audit history are joined manually here rather than via `include`.
   * Payments/charges/attendance are deliberately NOT duplicated here — the
   * profile page fetches those from the existing finance/attendance
   * endpoints instead (see useCharges, usePayments, useStudentAttendanceHistory).
   */
  async getStudentDetail(organizationId: string, id: string) {
    const student = await this.prisma.student.findFirst({ where: { id, organizationId } });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    const safeStudent = this.omitSecrets(student);

    const memberships = await this.prisma.groupMembership.findMany({
      where: { organizationId, studentId: id, status: "active" },
    });
    const groupIds = memberships.map((m) => m.groupId);
    const groups = groupIds.length
      ? await this.prisma.group.findMany({ where: { id: { in: groupIds } }, include: { branch: true } })
      : [];
    const courseIds = [...new Set(groups.map((g) => g.courseId))];
    const courses = courseIds.length ? await this.prisma.course.findMany({ where: { id: { in: courseIds } } }) : [];
    const courseById = new Map(courses.map((c) => [c.id, c]));
    const groupsWithCourse = groups.map((group) => ({ ...group, course: courseById.get(group.courseId) ?? null }));

    const auditLogRows = await this.prisma.auditLog.findMany({
      where: { organizationId, entityType: "Student", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { name: true } } },
    });
    const auditLogs = auditLogRows.map(({ actor, beforeValue, afterValue, ...rest }) => ({
      ...rest,
      actorName: actor?.name ?? null,
      beforeValue: redact(beforeValue),
      afterValue: redact(afterValue),
    }));

    return {
      ...safeStudent,
      groups: groupsWithCourse,
      auditLogs,
    };
  }

  async create(organizationId: string, actorId: string, dto: CreateStudentDto) {
    await this.limitsService.enforceLimit(organizationId, "student");
    const { dateOfBirth, ...rest } = dto;

    const student = await this.prisma.student.create({
      data: {
        ...rest,
        organizationId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "student.created",
      entityType: "Student",
      entityId: student.id,
      afterValue: student as unknown as Prisma.InputJsonValue,
    });

    await this.notificationsService.notifyOrgStaff(organizationId, actorId, ["owner", "manager"], {
      title: "New student registered",
      message: `New student registered: ${student.name}`,
      type: "success",
      entityType: "student",
      entityId: student.id,
    });

    return student;
  }

  async update(organizationId: string, actorId: string, id: string, dto: UpdateStudentDto) {
    const existing = await this.prisma.student.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Student not found");
    }

    const { dateOfBirth, ...rest } = dto;

    const student = await this.prisma.student.update({
      where: { id },
      data: {
        ...rest,
        dateOfBirth: dateOfBirth === undefined ? undefined : dateOfBirth === null ? null : new Date(dateOfBirth),
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "student.updated",
      entityType: "Student",
      entityId: student.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: student as unknown as Prisma.InputJsonValue,
    });

    return student;
  }

  async remove(organizationId: string, actorId: string, id: string) {
    const existing = await this.prisma.student.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Student not found");
    }

    await this.prisma.student.delete({ where: { id } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "student.deleted",
      entityType: "Student",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }

  async getNewcomers(organizationId: string) {
    const students = await this.prisma.student.findMany({
      where: { organizationId, status: "newcomer" },
      orderBy: { registeredAt: "desc" },
    });
    return students.map((student) => this.omitSecrets(student));
  }

  async getStageCounts(organizationId: string) {
    const counts = await this.prisma.student.groupBy({
      by: ["stage"],
      where: { organizationId },
      _count: { _all: true },
    });
    const byStage = new Map(counts.map((c) => [c.stage, c._count._all]));

    return {
      leads: byStage.get("lead") ?? 0,
      trials: byStage.get("trial") ?? 0,
      contracts: byStage.get("contract") ?? 0,
      paid: byStage.get("paid") ?? 0,
      refusals: byStage.get("refusal") ?? 0,
    };
  }

  async getArchivedStudents(organizationId: string) {
    const students = await this.prisma.student.findMany({
      where: { organizationId, status: "archived" },
      orderBy: { updatedAt: "desc" },
    });
    return students.map((student) => this.omitSecrets(student));
  }

  async getActiveStudents(organizationId: string) {
    const students = await this.prisma.student.findMany({
      where: { organizationId, status: "active" },
      orderBy: { convertedAt: "desc" },
    });

    const studentIds = students.map((s) => s.id);
    const memberships = await this.prisma.groupMembership.findMany({
      where: { organizationId, studentId: { in: studentIds }, status: "active" },
    });

    const groupIds = [...new Set(memberships.map((m) => m.groupId))];
    const groups = await this.prisma.group.findMany({ where: { id: { in: groupIds } } });
    const groupById = new Map(groups.map((g) => [g.id, g]));

    const membershipsByStudent = new Map<string, typeof memberships>();
    for (const membership of memberships) {
      const list = membershipsByStudent.get(membership.studentId) ?? [];
      list.push(membership);
      membershipsByStudent.set(membership.studentId, list);
    }

    return students.map((student) => ({
      ...this.omitSecrets(student),
      groupMemberships: (membershipsByStudent.get(student.id) ?? []).map((m) => ({
        ...m,
        group: groupById.get(m.groupId) ?? null,
      })),
    }));
  }

  async convertToActive(organizationId: string, actorId: string, id: string, dto: ConvertToActiveDto) {
    const student = await this.prisma.student.findFirst({ where: { id, organizationId } });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    if (student.status !== "newcomer") {
      throw new BadRequestException("Only newcomers can be converted to active students");
    }
    await this.limitsService.enforceLimit(organizationId, "student");

    const group = await this.prisma.group.findFirst({ where: { id: dto.groupId, organizationId } });
    if (!group) {
      throw new NotFoundException("Group not found");
    }
    const course = await this.prisma.course.findFirst({ where: { id: group.courseId, organizationId } });

    const DEFAULT_MONTHLY_FEE = 600_000;
    const fee = group.monthlyFee ?? course?.monthlyFee ?? DEFAULT_MONTHLY_FEE;

    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthYear = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const [, updated] = await this.prisma.$transaction([
      this.prisma.groupMembership.create({
        data: {
          organizationId,
          groupId: dto.groupId,
          studentId: id,
          enrolledAt: new Date(),
          status: "active",
        },
      }),
      this.prisma.student.update({
        where: { id },
        data: {
          status: "active",
          convertedAt: new Date(),
          stage: "contract",
          ...(dto.emergencyContact !== undefined ? { emergencyContact: dto.emergencyContact } : {}),
          ...(dto.parentPhone !== undefined ? { parentPhone: dto.parentPhone } : {}),
        },
      }),
      // Auto-charge on conversion — receptionists no longer register every
      // newly-converted student in finance by hand.
      this.prisma.charge.create({
        data: {
          organizationId,
          branchId: group.branchId,
          studentId: id,
          amount: fee,
          currency: "UZS",
          description: `Monthly fee — ${course?.name ?? "Course"} (${monthYear})`,
          dueDate: lastDayOfMonth,
          status: "pending",
        },
      }),
    ]);

    await this.auditService.record({
      organizationId,
      actorId,
      action: "student.converted",
      entityType: "Student",
      entityId: id,
      beforeValue: { status: "newcomer" } as unknown as Prisma.InputJsonValue,
      afterValue: { status: "active", groupId: dto.groupId } as unknown as Prisma.InputJsonValue,
    });

    return { ...updated, group };
  }

  // Distinct from convertToActive: this is a receptionist registering a
  // walk-in student directly as active (with their own login), skipping the
  // newcomer stage entirely — same auto-charge-on-enrollment logic though.
  async createDirect(organizationId: string, actorId: string, dto: CreateStudentDirectDto) {
    await this.limitsService.enforceLimit(organizationId, "student");

    const tempPassword = generateTempPassword();
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });

    let group: Prisma.GroupGetPayload<object> | null = null;
    let course: Prisma.CourseGetPayload<object> | null = null;
    if (dto.groupId) {
      group = await this.prisma.group.findFirst({ where: { id: dto.groupId, organizationId } });
      if (!group) {
        throw new NotFoundException("Group not found");
      }
      course = await this.prisma.course.findFirst({ where: { id: group.courseId, organizationId } });
    }

    const student = await this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          organizationId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          password: passwordHash,
          status: "active",
          stage: "contract",
          mustChangePassword: true,
          tempPassword,
          parentName: dto.parentName,
          parentEmail: dto.parentEmail,
          parentPhone: dto.parentPhone,
          registeredAt: new Date(),
          convertedAt: new Date(),
        },
      });

      if (group) {
        await tx.groupMembership.create({
          data: { organizationId, groupId: group.id, studentId: student.id, enrolledAt: new Date(), status: "active" },
        });

        const DEFAULT_MONTHLY_FEE = 600_000;
        const fee = group.monthlyFee ?? course?.monthlyFee ?? DEFAULT_MONTHLY_FEE;
        const now = new Date();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const monthYear = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

        await tx.charge.create({
          data: {
            organizationId,
            branchId: group.branchId,
            studentId: student.id,
            amount: fee,
            currency: "UZS",
            description: `Monthly fee — ${course?.name ?? "Course"} (${monthYear})`,
            dueDate: lastDayOfMonth,
            status: "pending",
          },
        });
      }

      return student;
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "student.created_direct",
      entityType: "Student",
      entityId: student.id,
      afterValue: student as unknown as Prisma.InputJsonValue,
    });

    return { student, tempPassword };
  }

  async linkParent(organizationId: string, actorId: string, id: string, dto: LinkParentDto) {
    const existing = await this.prisma.student.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Student not found");
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });

    await this.prisma.student.update({
      where: { id },
      data: {
        parentName: dto.parentName,
        parentEmail: dto.parentEmail,
        parentPhone: dto.parentPhone,
        parentPassword: passwordHash,
        mustChangePassword: true,
        tempPassword,
      },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "student.parent_linked",
      entityType: "Student",
      entityId: id,
      afterValue: { parentName: dto.parentName, parentEmail: dto.parentEmail } as unknown as Prisma.InputJsonValue,
    });

    return { parentName: dto.parentName, parentEmail: dto.parentEmail, parentPhone: dto.parentPhone, tempPassword };
  }

  /** Returns the student's own temp password only while unchanged — null once they've changed it. */
  async getTempPassword(organizationId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, organizationId },
      select: { mustChangePassword: true, tempPassword: true },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    return { tempPassword: student.mustChangePassword ? (student.tempPassword ?? null) : null };
  }

  async resetPassword(organizationId: string, actorId: string, id: string) {
    const existing = await this.prisma.student.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Student not found");
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
    await this.prisma.student.update({
      where: { id },
      data: { password: passwordHash, mustChangePassword: true, tempPassword },
    });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "student.password_reset",
      entityType: "Student",
      entityId: id,
    });

    return { tempPassword };
  }

  async archiveStudent(organizationId: string, actorId: string, id: string) {
    const existing = await this.prisma.student.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Student not found");
    }

    const student = await this.prisma.student.update({ where: { id }, data: { status: "archived" } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "student.archived",
      entityType: "Student",
      entityId: id,
      beforeValue: { status: existing.status } as unknown as Prisma.InputJsonValue,
      afterValue: { status: "archived" } as unknown as Prisma.InputJsonValue,
    });

    return student;
  }

  async addNote(organizationId: string, actorId: string, id: string, dto: AddNoteDto) {
    const existing = await this.prisma.student.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Student not found");
    }

    const timestamp = new Date().toLocaleString();
    const entry = `[${timestamp}] ${dto.note.trim()}`;
    const notes = existing.notes ? `${existing.notes}\n${entry}` : entry;

    const student = await this.prisma.student.update({ where: { id }, data: { notes } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "student.note_added",
      entityType: "Student",
      entityId: id,
      afterValue: { note: dto.note } as unknown as Prisma.InputJsonValue,
    });

    return student;
  }

  /** Student portal login: phone or email + password, scoped to one org (resolved from x-organization-id). */
  async validateStudentCredentials(organizationId: string, identifier: string, password: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        organizationId,
        status: "active",
        OR: [{ phone: identifier }, { email: identifier }],
      },
    });

    if (!student || !student.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await argon2.verify(student.password, password);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return student;
  }

  async changeStudentPassword(studentId: string, currentPassword: string, newPassword: string): Promise<void> {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || !student.password) {
      throw new UnauthorizedException("Not logged in");
    }
    const valid = await argon2.verify(student.password, currentPassword);
    if (!valid) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.student.update({
      where: { id: studentId },
      data: { password: passwordHash, mustChangePassword: false, tempPassword: null },
    });
  }

  // The parent password lives on the same Student row (see schema comment on
  // Student.mustChangePassword) — changing it clears the shared flag too, so
  // if the student's own login was also pending a change, this incidentally
  // clears that as well. Acceptable: either side changing their password is
  // evidence the account owner has taken control of it.
  async changeParentPassword(studentId: string, currentPassword: string, newPassword: string): Promise<void> {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || !student.parentPassword) {
      throw new UnauthorizedException("Not logged in");
    }
    const valid = await argon2.verify(student.parentPassword, currentPassword);
    if (!valid) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.student.update({
      where: { id: studentId },
      data: { parentPassword: passwordHash, mustChangePassword: false, tempPassword: null },
    });
  }

  /** Parent portal login: parent phone or email + password, scoped to one org. */
  async validateParentCredentials(organizationId: string, identifier: string, password: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        organizationId,
        status: "active",
        OR: [{ parentPhone: identifier }, { parentEmail: identifier }],
      },
    });

    if (!student || !student.parentPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await argon2.verify(student.parentPassword, password);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return student;
  }
}
