import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { HomeworkStatus, Prisma, SubmissionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateHomeworkDto } from "./dto/create-homework.dto";
import { UpdateHomeworkDto } from "./dto/update-homework.dto";
import { GradeSubmissionDto } from "./dto/grade-submission.dto";
import { HomeworkQueryDto } from "./dto/homework-query.dto";

const MANAGE_ROLES = ["owner", "admin", "manager"];

export interface HomeworkActor {
  userId: string;
  roleSlug: string;
}

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Resolves which Teacher a homework write should be attributed to, and
   * doubles as the permission check: owner/admin/manager may manage any
   * group's homework; a "teacher" role user may only manage homework for
   * groups they are actively assigned to.
   */
  private async resolveActingTeacherId(organizationId: string, groupId: string, actor: HomeworkActor) {
    if (actor.roleSlug === "teacher") {
      const teacher = await this.prisma.teacher.findFirst({ where: { organizationId, userId: actor.userId } });
      if (!teacher) {
        throw new ForbiddenException("No teacher profile linked to this account");
      }
      const assignment = await this.prisma.groupTeacherAssignment.findFirst({
        where: { organizationId, groupId, teacherId: teacher.id, status: "active" },
      });
      if (!assignment) {
        throw new ForbiddenException("You are not assigned to this group");
      }
      return teacher.id;
    }

    if (!MANAGE_ROLES.includes(actor.roleSlug)) {
      throw new ForbiddenException("You do not have permission to manage homework for this group");
    }

    const assignments = await this.prisma.groupTeacherAssignment.findMany({
      where: { organizationId, groupId, status: "active" },
    });
    if (assignments.length === 0) {
      throw new BadRequestException("This group has no assigned teacher to attribute the homework to");
    }
    const primary = assignments.find((a) => a.assignmentRole === "primary") ?? assignments[0];
    return primary.teacherId;
  }

  private async assertCanManageHomework(organizationId: string, groupId: string, actor: HomeworkActor) {
    await this.resolveActingTeacherId(organizationId, groupId, actor);
  }

  private async withSubmissionCounts<T extends { id: string }>(homeworks: T[]) {
    const homeworkIds = homeworks.map((h) => h.id);
    const submissions = homeworkIds.length
      ? await this.prisma.homeworkSubmission.groupBy({
          by: ["homeworkId", "status"],
          where: { homeworkId: { in: homeworkIds } },
          _count: { _all: true },
        })
      : [];

    const countsByHomework = new Map<string, Record<string, number>>();
    for (const row of submissions) {
      const current = countsByHomework.get(row.homeworkId) ?? {};
      current[row.status] = row._count._all;
      countsByHomework.set(row.homeworkId, current);
    }

    return homeworks.map((homework) => {
      const counts = countsByHomework.get(homework.id) ?? {};
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      const submitted = (counts.submitted ?? 0) + (counts.graded ?? 0) + (counts.late ?? 0);
      return { ...homework, submissionCounts: { total, submitted, ...counts } };
    });
  }

  async createHomework(organizationId: string, actor: HomeworkActor, dto: CreateHomeworkDto) {
    const group = await this.prisma.group.findFirst({ where: { id: dto.groupId, organizationId } });
    if (!group) {
      throw new NotFoundException("Group not found");
    }

    if (dto.lessonId) {
      const lesson = await this.prisma.lesson.findFirst({ where: { id: dto.lessonId, organizationId, groupId: dto.groupId } });
      if (!lesson) {
        throw new NotFoundException("Lesson not found for this group");
      }
    }

    const teacherId = await this.resolveActingTeacherId(organizationId, dto.groupId, actor);

    const homework = await this.prisma.$transaction(async (tx) => {
      const created = await tx.homework.create({
        data: {
          organizationId,
          branchId: group.branchId,
          groupId: dto.groupId,
          lessonId: dto.lessonId,
          teacherId,
          title: dto.title,
          description: dto.description,
          dueDate: new Date(dto.dueDate),
        },
      });

      const memberships = await tx.groupMembership.findMany({
        where: { organizationId, groupId: dto.groupId, status: "active" },
      });

      if (memberships.length > 0) {
        await tx.homeworkSubmission.createMany({
          data: memberships.map((m) => ({
            organizationId,
            homeworkId: created.id,
            studentId: m.studentId,
            status: "pending" as SubmissionStatus,
          })),
        });
      }

      return created;
    });

    await this.auditService.record({
      organizationId,
      actorId: actor.userId,
      action: "homework.created",
      entityType: "Homework",
      entityId: homework.id,
      afterValue: homework as unknown as Prisma.InputJsonValue,
    });

    const [withCounts] = await this.withSubmissionCounts([homework]);
    return withCounts;
  }

  async getHomeworkByGroup(organizationId: string, query: HomeworkQueryDto) {
    const group = await this.prisma.group.findFirst({ where: { id: query.groupId, organizationId } });
    if (!group) {
      throw new NotFoundException("Group not found");
    }

    const homeworks = await this.prisma.homework.findMany({
      where: { organizationId, groupId: query.groupId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { dueDate: "desc" },
    });

    const teacherIds = [...new Set(homeworks.map((h) => h.teacherId))];
    const lessonIds = [...new Set(homeworks.map((h) => h.lessonId).filter((id): id is string => !!id))];
    const [teachers, lessons] = await Promise.all([
      teacherIds.length ? this.prisma.teacher.findMany({ where: { id: { in: teacherIds } } }) : Promise.resolve([]),
      lessonIds.length ? this.prisma.lesson.findMany({ where: { id: { in: lessonIds } } }) : Promise.resolve([]),
    ]);
    const teacherById = new Map(teachers.map((t) => [t.id, t]));
    const lessonById = new Map(lessons.map((l) => [l.id, l]));

    const withCounts = await this.withSubmissionCounts(homeworks);
    return withCounts.map((h) => ({
      ...h,
      teacher: teacherById.get(h.teacherId) ?? null,
      lesson: h.lessonId ? lessonById.get(h.lessonId) ?? null : null,
    }));
  }

  async getHomeworkDetail(organizationId: string, id: string) {
    const homework = await this.prisma.homework.findFirst({ where: { id, organizationId } });
    if (!homework) {
      throw new NotFoundException("Homework not found");
    }

    const [teacher, lesson, submissions] = await Promise.all([
      this.prisma.teacher.findFirst({ where: { id: homework.teacherId } }),
      homework.lessonId ? this.prisma.lesson.findFirst({ where: { id: homework.lessonId } }) : Promise.resolve(null),
      this.prisma.homeworkSubmission.findMany({ where: { organizationId, homeworkId: id } }),
    ]);

    const studentIds = [...new Set(submissions.map((s) => s.studentId))];
    const students = studentIds.length
      ? await this.prisma.student.findMany({ where: { id: { in: studentIds } } })
      : [];
    const studentById = new Map(students.map((s) => [s.id, s]));

    return {
      ...homework,
      teacher,
      lesson,
      submissions: submissions
        .map((s) => ({ ...s, student: studentById.get(s.studentId) ?? null }))
        .sort((a, b) => (a.student?.name ?? "").localeCompare(b.student?.name ?? "")),
    };
  }

  async updateHomework(organizationId: string, actor: HomeworkActor, id: string, dto: UpdateHomeworkDto) {
    const existing = await this.prisma.homework.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Homework not found");
    }
    await this.assertCanManageHomework(organizationId, existing.groupId, actor);

    // Cancelling leaves submissions in place — they're an audit trail, not
    // something to clean up (Security Rule 2 analogue: never destroy history).
    const { dueDate, ...rest } = dto;
    const homework = await this.prisma.homework.update({
      where: { id },
      data: { ...rest, dueDate: dueDate ? new Date(dueDate) : undefined },
    });

    await this.auditService.record({
      organizationId,
      actorId: actor.userId,
      action: "homework.updated",
      entityType: "Homework",
      entityId: homework.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: homework as unknown as Prisma.InputJsonValue,
    });

    return homework;
  }

  async deleteHomework(organizationId: string, actor: HomeworkActor, id: string) {
    const existing = await this.prisma.homework.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Homework not found");
    }
    await this.assertCanManageHomework(organizationId, existing.groupId, actor);

    await this.prisma.$transaction([
      this.prisma.homeworkSubmission.deleteMany({ where: { organizationId, homeworkId: id } }),
      this.prisma.homework.delete({ where: { id } }),
    ]);

    await this.auditService.record({
      organizationId,
      actorId: actor.userId,
      action: "homework.deleted",
      entityType: "Homework",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }

  async gradeSubmission(organizationId: string, actor: HomeworkActor, submissionId: string, dto: GradeSubmissionDto) {
    const submission = await this.prisma.homeworkSubmission.findFirst({
      where: { id: submissionId, organizationId },
    });
    if (!submission) {
      throw new NotFoundException("Submission not found");
    }

    const homework = await this.prisma.homework.findFirst({ where: { id: submission.homeworkId, organizationId } });
    if (!homework) {
      throw new NotFoundException("Homework not found");
    }
    await this.assertCanManageHomework(organizationId, homework.groupId, actor);

    const updated = await this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        status: "graded" as SubmissionStatus,
        score: dto.score,
        feedback: dto.feedback,
        submittedAt: submission.submittedAt ?? new Date(),
      },
    });

    await this.auditService.record({
      organizationId,
      actorId: actor.userId,
      action: "homework.submission_graded",
      entityType: "HomeworkSubmission",
      entityId: updated.id,
      beforeValue: submission as unknown as Prisma.InputJsonValue,
      afterValue: updated as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async getStudentHomework(organizationId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, organizationId } });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const submissions = await this.prisma.homeworkSubmission.findMany({
      where: { organizationId, studentId },
    });

    const homeworkIds = [...new Set(submissions.map((s) => s.homeworkId))];
    const homeworks = homeworkIds.length
      ? await this.prisma.homework.findMany({ where: { id: { in: homeworkIds } } })
      : [];
    const homeworkById = new Map(homeworks.map((h) => [h.id, h]));

    const groupIds = [...new Set(homeworks.map((h) => h.groupId))];
    const groups = groupIds.length ? await this.prisma.group.findMany({ where: { id: { in: groupIds } } }) : [];
    const groupById = new Map(groups.map((g) => [g.id, g]));

    return submissions
      .map((s) => {
        const homework = homeworkById.get(s.homeworkId);
        return {
          submissionId: s.id,
          homeworkId: s.homeworkId,
          title: homework?.title ?? "",
          description: homework?.description ?? null,
          group: homework ? groupById.get(homework.groupId) ?? null : null,
          dueDate: homework?.dueDate ?? null,
          homeworkStatus: homework?.status ?? ("active" as HomeworkStatus),
          submissionStatus: s.status,
          score: s.score,
          feedback: s.feedback,
        };
      })
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return b.dueDate.getTime() - a.dueDate.getTime();
      });
  }
}
