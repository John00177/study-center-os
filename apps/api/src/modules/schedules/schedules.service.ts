import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { CalendarQueryDto } from "./dto/calendar-query.dto";
import { ConflictQueryDto } from "./dto/conflict-query.dto";
import { getWeekStartMonday, timeRangesOverlap } from "./utils/time-overlap";

interface ConflictCheckInput {
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroomId?: string;
  excludeId?: string;
}

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async withDerivedFields<T extends { groupId: string; classroomId: string | null }>(
    schedules: T[],
  ) {
    const groupIds = [...new Set(schedules.map((s) => s.groupId))];
    const classroomIds = [...new Set(schedules.map((s) => s.classroomId).filter((id): id is string => !!id))];

    const [groups, classrooms] = await Promise.all([
      this.prisma.group.findMany({ where: { id: { in: groupIds } } }),
      classroomIds.length
        ? this.prisma.classroom.findMany({ where: { id: { in: classroomIds } } })
        : Promise.resolve([]),
    ]);

    const groupById = new Map(groups.map((g) => [g.id, g]));
    const classroomById = new Map(classrooms.map((c) => [c.id, c]));

    return schedules.map((schedule) => ({
      ...schedule,
      group: groupById.get(schedule.groupId) ?? null,
      classroom: schedule.classroomId ? classroomById.get(schedule.classroomId) ?? null : null,
    }));
  }

  async findAll(organizationId: string) {
    const schedules = await this.prisma.schedule.findMany({
      where: { organizationId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return this.withDerivedFields(schedules);
  }

  async findOne(organizationId: string, id: string) {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, organizationId } });
    if (!schedule) {
      throw new NotFoundException("Schedule not found");
    }
    const [withFields] = await this.withDerivedFields([schedule]);
    return withFields;
  }

  /**
   * A booking conflicts if it shares a classroom with another session that
   * overlaps in time, or if the same group already has an overlapping
   * session (a group can't be in two places at once, classroom or not).
   */
  async hasConflict(organizationId: string, input: ConflictCheckInput): Promise<boolean> {
    const candidates = await this.prisma.schedule.findMany({
      where: {
        organizationId,
        dayOfWeek: input.dayOfWeek,
        id: input.excludeId ? { not: input.excludeId } : undefined,
        OR: [{ groupId: input.groupId }, ...(input.classroomId ? [{ classroomId: input.classroomId }] : [])],
      },
    });

    return candidates.some((c) => timeRangesOverlap(input.startTime, input.endTime, c.startTime, c.endTime));
  }

  async checkConflict(organizationId: string, query: ConflictQueryDto): Promise<{ conflict: boolean }> {
    const conflict = await this.hasConflict(organizationId, query);
    return { conflict };
  }

  async create(organizationId: string, actorId: string, dto: CreateScheduleDto) {
    if (await this.hasConflict(organizationId, dto)) {
      throw new BadRequestException(
        "This time conflicts with another session in the same classroom or the same group.",
      );
    }

    const schedule = await this.prisma.schedule.create({ data: { ...dto, organizationId } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "schedule.created",
      entityType: "Schedule",
      entityId: schedule.id,
      afterValue: schedule as unknown as Prisma.InputJsonValue,
    });

    return schedule;
  }

  async update(organizationId: string, actorId: string, id: string, dto: UpdateScheduleDto) {
    const existing = await this.prisma.schedule.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Schedule not found");
    }

    const merged: ConflictCheckInput = {
      groupId: dto.groupId ?? existing.groupId,
      dayOfWeek: dto.dayOfWeek ?? existing.dayOfWeek,
      startTime: dto.startTime ?? existing.startTime,
      endTime: dto.endTime ?? existing.endTime,
      classroomId: dto.classroomId !== undefined ? dto.classroomId : (existing.classroomId ?? undefined),
      excludeId: id,
    };
    if (await this.hasConflict(organizationId, merged)) {
      throw new BadRequestException(
        "This time conflicts with another session in the same classroom or the same group.",
      );
    }

    const schedule = await this.prisma.schedule.update({ where: { id }, data: dto });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "schedule.updated",
      entityType: "Schedule",
      entityId: schedule.id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
      afterValue: schedule as unknown as Prisma.InputJsonValue,
    });

    const assignment = await this.prisma.groupTeacherAssignment.findFirst({
      where: { organizationId, groupId: schedule.groupId, status: "active", assignmentRole: "primary" },
    });
    if (assignment) {
      const teacher = await this.prisma.teacher.findFirst({ where: { id: assignment.teacherId } });
      if (teacher?.userId) {
        void this.notificationsService.sendToUser(
          teacher.userId,
          "Schedule changed",
          `A session for your group has been rescheduled.`,
        );
      }
    }

    return schedule;
  }

  // Hard delete: schedules carry no historical/financial meaning on their
  // own (Attendance and Lesson records reference groupId/date, not the
  // Schedule row), so there's nothing worth preserving via a soft delete.
  async remove(organizationId: string, actorId: string, id: string) {
    const existing = await this.prisma.schedule.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException("Schedule not found");
    }

    await this.prisma.schedule.delete({ where: { id } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "schedule.deleted",
      entityType: "Schedule",
      entityId: id,
      beforeValue: existing as unknown as Prisma.InputJsonValue,
    });

    return { id };
  }

  async getCalendarData(
    organizationId: string,
    query: CalendarQueryDto,
    forceTeacherId: string | undefined,
  ) {
    const monday = getWeekStartMonday(new Date(query.weekStart));
    const teacherId = forceTeacherId ?? query.teacherId;

    const schedules = await this.prisma.schedule.findMany({
      where: {
        organizationId,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.classroomId ? { classroomId: query.classroomId } : {}),
      },
    });

    const groupIds = [...new Set(schedules.map((s) => s.groupId))];
    const classroomIds = [...new Set(schedules.map((s) => s.classroomId).filter((id): id is string => !!id))];

    const [groups, classrooms, assignments] = await Promise.all([
      this.prisma.group.findMany({ where: { id: { in: groupIds } }, include: { branch: true } }),
      classroomIds.length
        ? this.prisma.classroom.findMany({ where: { id: { in: classroomIds } } })
        : Promise.resolve([]),
      this.prisma.groupTeacherAssignment.findMany({
        where: { organizationId, groupId: { in: groupIds }, status: "active" },
      }),
    ]);

    const courseIds = [...new Set(groups.map((g) => g.courseId))];
    const [courses, studentCounts] = await Promise.all([
      this.prisma.course.findMany({ where: { id: { in: courseIds } } }),
      this.prisma.groupMembership.groupBy({
        by: ["groupId"],
        where: { organizationId, groupId: { in: groupIds }, status: "active" },
        _count: { groupId: true },
      }),
    ]);

    const teacherIds = [...new Set(assignments.map((a) => a.teacherId))];
    const teachers = teacherIds.length
      ? await this.prisma.teacher.findMany({ where: { id: { in: teacherIds } } })
      : [];

    const groupById = new Map(groups.map((g) => [g.id, g]));
    const courseById = new Map(courses.map((c) => [c.id, c]));
    const classroomById = new Map(classrooms.map((c) => [c.id, c]));
    const teacherById = new Map(teachers.map((t) => [t.id, t]));
    const studentCountByGroup = new Map(studentCounts.map((row) => [row.groupId, row._count.groupId]));

    // One teacher per group for display: prefer the "primary" assignment.
    const primaryTeacherIdByGroup = new Map<string, string>();
    for (const assignment of assignments) {
      const current = primaryTeacherIdByGroup.get(assignment.groupId);
      if (!current || assignment.assignmentRole === "primary") {
        primaryTeacherIdByGroup.set(assignment.groupId, assignment.teacherId);
      }
    }

    const filteredSchedules = teacherId
      ? schedules.filter((s) => primaryTeacherIdByGroup.get(s.groupId) === teacherId)
      : schedules;

    const sessions = filteredSchedules.map((schedule) => {
      const group = groupById.get(schedule.groupId);
      const course = group ? courseById.get(group.courseId) : undefined;
      const teacherIdForGroup = primaryTeacherIdByGroup.get(schedule.groupId);
      const teacher = teacherIdForGroup ? teacherById.get(teacherIdForGroup) : undefined;
      const classroom = schedule.classroomId ? classroomById.get(schedule.classroomId) : undefined;

      return {
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        group: group ? { id: group.id, name: group.name } : null,
        course: course ? { id: course.id, name: course.name } : null,
        branch: group ? { id: group.branch.id, name: group.branch.name } : null,
        classroom: classroom ? { id: classroom.id, name: classroom.name } : null,
        teacher: teacher ? { id: teacher.id, name: teacher.name } : null,
        studentCount: studentCountByGroup.get(schedule.groupId) ?? 0,
      };
    });

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + i);
      const dayOfWeek = date.getUTCDay();
      days.push({
        date: date.toISOString().slice(0, 10),
        dayOfWeek,
        sessions: sessions
          .filter((s) => s.dayOfWeek === dayOfWeek)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      });
    }

    return { weekStart: monday.toISOString().slice(0, 10), days };
  }
}
