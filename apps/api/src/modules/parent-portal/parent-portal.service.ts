import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AttendanceService } from "../attendance/attendance.service";
import { HomeworkService } from "../homework/homework.service";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ParentPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
    private readonly homeworkService: HomeworkService,
  ) {}

  private async getStudentOrThrow(organizationId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, organizationId } });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    return student;
  }

  /**
   * Active groups the student is enrolled in, with full teacher contact
   * details attached — this is the parent portal's key feature, so unlike
   * the student portal's equivalent helper, teacher is a full object rather
   * than just a name/phone/email flattened onto the group.
   */
  private async getEnrolledGroups(organizationId: string, studentId: string) {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { organizationId, studentId, status: "active" },
    });
    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) return [];

    const groups = await this.prisma.group.findMany({ where: { id: { in: groupIds } } });
    const courseIds = [...new Set(groups.map((g) => g.courseId))];
    const branchIds = [...new Set(groups.map((g) => g.branchId))];
    const schedules = await this.prisma.schedule.findMany({ where: { organizationId, groupId: { in: groupIds } } });
    const assignments = await this.prisma.groupTeacherAssignment.findMany({
      where: { organizationId, groupId: { in: groupIds }, status: "active" },
    });
    const teacherIds = [...new Set(assignments.map((a) => a.teacherId))];
    const classroomIds = [...new Set(schedules.map((s) => s.classroomId).filter((id): id is string => !!id))];

    const [courses, branches, teachers, classrooms] = await Promise.all([
      courseIds.length ? this.prisma.course.findMany({ where: { id: { in: courseIds } } }) : Promise.resolve([]),
      branchIds.length ? this.prisma.branch.findMany({ where: { id: { in: branchIds } } }) : Promise.resolve([]),
      teacherIds.length ? this.prisma.teacher.findMany({ where: { id: { in: teacherIds } } }) : Promise.resolve([]),
      classroomIds.length ? this.prisma.classroom.findMany({ where: { id: { in: classroomIds } } }) : Promise.resolve([]),
    ]);
    const courseById = new Map(courses.map((c) => [c.id, c]));
    const branchById = new Map(branches.map((b) => [b.id, b]));
    const teacherById = new Map(teachers.map((t) => [t.id, t]));
    const classroomById = new Map(classrooms.map((c) => [c.id, c]));

    const primaryTeacherByGroup = new Map<string, string>();
    for (const a of assignments) {
      const current = primaryTeacherByGroup.get(a.groupId);
      if (!current || a.assignmentRole === "primary") primaryTeacherByGroup.set(a.groupId, a.teacherId);
    }
    const schedulesByGroup = new Map<string, typeof schedules>();
    for (const s of schedules) {
      const list = schedulesByGroup.get(s.groupId) ?? [];
      list.push(s);
      schedulesByGroup.set(s.groupId, list);
    }

    return groups.map((group) => {
      const teacherId = primaryTeacherByGroup.get(group.id);
      const teacher = teacherId ? teacherById.get(teacherId) : undefined;
      const branch = branchById.get(group.branchId);
      const course = courseById.get(group.courseId);
      return {
        id: group.id,
        name: group.name,
        courseName: course?.name ?? "Unknown",
        courseCategory: course?.category ?? "other",
        branchName: branch?.name ?? "Unknown",
        branchPhone: branch?.phone ?? null,
        teacher: teacher
          ? {
              id: teacher.id,
              name: teacher.name,
              email: teacher.email,
              phone: teacher.phone,
              specialization: teacher.specialization,
            }
          : null,
        schedule: (schedulesByGroup.get(group.id) ?? []).map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          classroomName: s.classroomId ? classroomById.get(s.classroomId)?.name ?? null : null,
        })),
      };
    });
  }

  async getSchedule(organizationId: string, studentId: string) {
    await this.getStudentOrThrow(organizationId, studentId);
    const groups = await this.getEnrolledGroups(organizationId, studentId);

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();

      const sessions = groups.flatMap((group) =>
        group.schedule
          .filter((s) => s.dayOfWeek === dayOfWeek)
          .map((s) => ({
            groupId: group.id,
            groupName: group.name,
            courseName: group.courseName,
            teacherName: group.teacher?.name ?? "Unassigned",
            classroomName: s.classroomName,
            branchName: group.branchName,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
      );
      sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

      days.push({ date: date.toISOString().slice(0, 10), dayOfWeek, sessions });
    }

    return days;
  }

  async getAttendance(organizationId: string, studentId: string) {
    await this.getStudentOrThrow(organizationId, studentId);
    const records = await this.attendanceService.findForStudent(organizationId, studentId);
    const groups = await this.getEnrolledGroups(organizationId, studentId);
    const teacherNameByGroup = new Map(groups.map((g) => [g.id, g.teacher?.name ?? "Unassigned"]));

    return records.map((r) => ({
      id: r.id,
      date: r.date,
      status: r.status,
      notes: r.notes,
      groupName: r.group?.name ?? "Unknown",
      teacherName: r.group ? teacherNameByGroup.get(r.group.id) ?? "Unassigned" : "Unassigned",
    }));
  }

  async getHomework(organizationId: string, studentId: string) {
    await this.getStudentOrThrow(organizationId, studentId);
    const homework = await this.homeworkService.getStudentHomework(organizationId, studentId);
    const groups = await this.getEnrolledGroups(organizationId, studentId);
    const teacherNameByGroup = new Map(groups.map((g) => [g.id, g.teacher?.name ?? "Unassigned"]));

    return homework.map((h) => ({
      ...h,
      teacherName: h.group ? teacherNameByGroup.get(h.group.id) ?? "Unassigned" : "Unassigned",
    }));
  }

  /** The key feature: every teacher across the student's active groups, with contact details. */
  async getTeachers(organizationId: string, studentId: string) {
    await this.getStudentOrThrow(organizationId, studentId);
    const groups = await this.getEnrolledGroups(organizationId, studentId);

    return groups
      .filter((g) => g.teacher)
      .map((g) => ({
        id: g.teacher!.id,
        name: g.teacher!.name,
        email: g.teacher!.email,
        phone: g.teacher!.phone,
        specialization: g.teacher!.specialization,
        groupName: g.name,
        courseName: g.courseName,
        branchPhone: g.branchPhone,
      }));
  }

  async getPayments(organizationId: string, studentId: string) {
    await this.getStudentOrThrow(organizationId, studentId);
    const [charges, payments] = await Promise.all([
      this.prisma.charge.findMany({ where: { organizationId, studentId }, orderBy: { dueDate: "desc" } }),
      this.prisma.payment.findMany({ where: { organizationId, studentId }, orderBy: { createdAt: "desc" } }),
    ]);

    const totalOwed = charges
      .filter((c) => c.status === "pending" || c.status === "overdue")
      .reduce((sum, c) => sum + c.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const now = Date.now();

    return {
      totalOwed,
      totalPaid,
      balance: totalOwed,
      charges: charges.map((c) => {
        const diffDays = Math.floor((c.dueDate.getTime() - now) / MS_PER_DAY);
        const isOverdue = c.status === "overdue" || (c.status === "pending" && diffDays < 0);
        return {
          id: c.id,
          amount: c.amount,
          currency: c.currency,
          description: c.description,
          dueDate: c.dueDate,
          status: c.status,
          daysOverdue: isOverdue ? Math.abs(diffDays) : null,
          daysUntilDue: c.status === "pending" && diffDays >= 0 ? diffDays : null,
        };
      }),
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        date: p.createdAt,
        method: p.paymentMethod,
      })),
    };
  }

  async getDashboard(organizationId: string, studentId: string) {
    const student = await this.getStudentOrThrow(organizationId, studentId);
    const [groups, attendance, homework, payments] = await Promise.all([
      this.getEnrolledGroups(organizationId, studentId),
      this.attendanceService.findForStudent(organizationId, studentId),
      this.getHomework(organizationId, studentId),
      this.getPayments(organizationId, studentId),
    ]);

    const present = attendance.filter((a) => a.status === "present").length;
    const absent = attendance.filter((a) => a.status === "absent").length;
    const late = attendance.filter((a) => a.status === "late").length;
    const excused = attendance.filter((a) => a.status === "excused").length;
    const total = present + absent + late + excused;

    const recentAttendance = attendance.slice(0, 5).map((a) => ({
      date: a.date,
      status: a.status,
      groupName: a.group?.name ?? "Unknown",
    }));

    return {
      student: {
        name: student.name,
        email: student.email,
        phone: student.phone,
        parentName: student.parentName,
        parentEmail: student.parentEmail,
        parentPhone: student.parentPhone,
      },
      groups,
      attendanceSummary: {
        present,
        absent,
        late,
        excused,
        rate: total > 0 ? Math.round((present / total) * 100) : null,
      },
      recentAttendance,
      homework,
      payments,
    };
  }
}
