import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AttendanceService } from "../attendance/attendance.service";
import { NotificationsService } from "../notifications/notifications.service";
import { MarkGroupAttendanceDto } from "./dto/mark-group-attendance.dto";

interface CreateLessonNoteInput {
  date: string;
  title: string;
  description?: string;
}

@Injectable()
export class TeacherDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Restricts group-scoped endpoints to the teacher's own assigned groups.
   * When teacherId is undefined (an admin viewing without ?teacherId=), no
   * restriction is applied — admins get full visibility.
   */
  private async assertGroupAccess(organizationId: string, groupId: string, teacherId: string | undefined) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, organizationId } });
    if (!group) {
      throw new NotFoundException("Group not found");
    }

    if (teacherId) {
      const assignment = await this.prisma.groupTeacherAssignment.findFirst({
        where: { organizationId, groupId, teacherId, status: "active" },
      });
      if (!assignment) {
        throw new ForbiddenException("You are not assigned to this group");
      }
    }

    return group;
  }

  async getMyGroups(organizationId: string, teacherId: string | undefined) {
    const assignments = await this.prisma.groupTeacherAssignment.findMany({
      where: { organizationId, status: "active", ...(teacherId ? { teacherId } : {}) },
    });

    const groupIds = [...new Set(assignments.map((a) => a.groupId))];
    if (groupIds.length === 0) return [];

    const groups = await this.prisma.group.findMany({
      where: { id: { in: groupIds } },
      include: { branch: true },
    });

    const courseIds = [...new Set(groups.map((g) => g.courseId))];
    const [courses, studentCounts, schedules] = await Promise.all([
      this.prisma.course.findMany({ where: { id: { in: courseIds } } }),
      this.prisma.groupMembership.groupBy({
        by: ["groupId"],
        where: { organizationId, groupId: { in: groupIds }, status: "active" },
        _count: { groupId: true },
      }),
      this.prisma.schedule.findMany({ where: { organizationId, groupId: { in: groupIds } } }),
    ]);

    const courseById = new Map(courses.map((c) => [c.id, c]));
    const studentCountByGroup = new Map(studentCounts.map((row) => [row.groupId, row._count.groupId]));
    const schedulesByGroup = new Map<string, typeof schedules>();
    for (const schedule of schedules) {
      const list = schedulesByGroup.get(schedule.groupId) ?? [];
      list.push(schedule);
      schedulesByGroup.set(schedule.groupId, list);
    }

    return groups.map((group) => ({
      ...group,
      course: courseById.get(group.courseId) ?? null,
      studentCount: studentCountByGroup.get(group.id) ?? 0,
      schedules: schedulesByGroup.get(group.id) ?? [],
    }));
  }

  async getGroupStudents(organizationId: string, groupId: string, teacherId: string | undefined) {
    await this.assertGroupAccess(organizationId, groupId, teacherId);

    const memberships = await this.prisma.groupMembership.findMany({
      where: { organizationId, groupId, status: "active" },
    });
    const studentIds = memberships.map((m) => m.studentId);
    if (studentIds.length === 0) return [];

    const [students, attendanceRecords] = await Promise.all([
      this.prisma.student.findMany({ where: { id: { in: studentIds } } }),
      this.prisma.attendance.findMany({ where: { organizationId, groupId, studentId: { in: studentIds } } }),
    ]);

    const recordsByStudent = new Map<string, typeof attendanceRecords>();
    for (const record of attendanceRecords) {
      const list = recordsByStudent.get(record.studentId) ?? [];
      list.push(record);
      recordsByStudent.set(record.studentId, list);
    }

    return students.map((student) => {
      const records = recordsByStudent.get(student.id) ?? [];
      const attended = records.filter((r) => r.status === "present" || r.status === "late").length;
      return {
        ...student,
        totalAttendanceRecords: records.length,
        attendanceRate: records.length > 0 ? Math.round((attended / records.length) * 100) : null,
      };
    });
  }

  /** Flattened roster across every group the teacher is actively assigned to. */
  async getAllStudents(organizationId: string, teacherId: string | undefined) {
    const assignments = await this.prisma.groupTeacherAssignment.findMany({
      where: { organizationId, status: "active", ...(teacherId ? { teacherId } : {}) },
    });
    const groupIds = [...new Set(assignments.map((a) => a.groupId))];
    if (groupIds.length === 0) return [];

    const [groups, memberships] = await Promise.all([
      this.prisma.group.findMany({ where: { id: { in: groupIds } } }),
      this.prisma.groupMembership.findMany({
        where: { organizationId, groupId: { in: groupIds }, status: "active" },
      }),
    ]);
    const groupById = new Map(groups.map((g) => [g.id, g]));

    const studentIds = [...new Set(memberships.map((m) => m.studentId))];
    const students = studentIds.length
      ? await this.prisma.student.findMany({ where: { id: { in: studentIds } } })
      : [];
    const studentById = new Map(students.map((s) => [s.id, s]));

    return memberships
      .map((m) => ({
        student: studentById.get(m.studentId) ?? null,
        groupId: m.groupId,
        groupName: groupById.get(m.groupId)?.name ?? "Unknown",
        enrolledAt: m.enrolledAt,
      }))
      .filter((row) => row.student !== null)
      .sort((a, b) => (a.student!.name ?? "").localeCompare(b.student!.name ?? ""));
  }

  async getGroupAttendance(
    organizationId: string,
    groupId: string,
    teacherId: string | undefined,
    date: string,
  ) {
    await this.assertGroupAccess(organizationId, groupId, teacherId);
    return this.attendanceService.findForGroupAndDate(organizationId, groupId, date);
  }

  async markGroupAttendance(
    organizationId: string,
    actorId: string,
    groupId: string,
    teacherId: string | undefined,
    dto: MarkGroupAttendanceDto,
  ) {
    // Scoped mark-attendance for teachers: assertGroupAccess enforces that a
    // "teacher" role caller is actually assigned to this group before we
    // delegate to the shared bulk-upsert logic.
    await this.assertGroupAccess(organizationId, groupId, teacherId);
    return this.attendanceService.bulkMark(organizationId, actorId, {
      groupId,
      date: dto.date,
      records: dto.records,
    });
  }

  async createLessonNote(
    organizationId: string,
    actorId: string,
    groupId: string,
    teacherId: string | undefined,
    dto: CreateLessonNoteInput,
  ) {
    const group = await this.assertGroupAccess(organizationId, groupId, teacherId);

    if (!teacherId) {
      throw new BadRequestException(
        "No teacher context resolved for this request — pass ?teacherId= to attribute the lesson note",
      );
    }

    const lesson = await this.prisma.lesson.create({
      data: {
        organizationId,
        branchId: group.branchId,
        groupId,
        teacherId,
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
      },
    });

    this.notificationsService.notify(
      group.name,
      "New lesson note",
      `A new lesson note "${lesson.title}" was added to ${group.name}.`,
    );

    return lesson;
  }

  async getLessonNotes(organizationId: string, groupId: string, teacherId: string | undefined) {
    await this.assertGroupAccess(organizationId, groupId, teacherId);
    return this.prisma.lesson.findMany({
      where: { organizationId, groupId },
      orderBy: { date: "desc" },
    });
  }
}
