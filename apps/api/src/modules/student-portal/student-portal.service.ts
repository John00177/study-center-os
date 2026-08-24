import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AttendanceService } from "../attendance/attendance.service";
import { HomeworkService } from "../homework/homework.service";

@Injectable()
export class StudentPortalService {
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

  /** Active groups the student is enrolled in, with course/teacher/branch/schedule attached. */
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
      return {
        id: group.id,
        name: group.name,
        courseName: courseById.get(group.courseId)?.name ?? "Unknown",
        teacherName: teacher?.name ?? "Unassigned",
        teacherPhone: teacher?.phone ?? null,
        teacherEmail: teacher?.email ?? null,
        branchName: branch?.name ?? "Unknown",
        branchAddress: branch?.address ?? null,
        schedule: (schedulesByGroup.get(group.id) ?? []).map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          classroomName: s.classroomId ? classroomById.get(s.classroomId)?.name ?? null : null,
        })),
      };
    });
  }

  async getStudentSchedule(organizationId: string, studentId: string) {
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
            teacherName: group.teacherName,
            teacherPhone: group.teacherPhone,
            teacherEmail: group.teacherEmail,
            branchName: group.branchName,
            branchAddress: group.branchAddress,
            classroomName: s.classroomName,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
      );
      sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

      days.push({ date: date.toISOString().slice(0, 10), dayOfWeek, sessions });
    }

    return days;
  }

  async getStudentAttendance(organizationId: string, studentId: string) {
    await this.getStudentOrThrow(organizationId, studentId);
    const records = await this.attendanceService.findForStudent(organizationId, studentId);
    return records.map((r) => ({
      id: r.id,
      date: r.date,
      status: r.status,
      notes: r.notes,
      groupName: r.group?.name ?? "Unknown",
    }));
  }

  async getStudentHomework(organizationId: string, studentId: string) {
    await this.getStudentOrThrow(organizationId, studentId);
    return this.homeworkService.getStudentHomework(organizationId, studentId);
  }

  async getStudentPayments(organizationId: string, studentId: string) {
    await this.getStudentOrThrow(organizationId, studentId);
    const [charges, payments] = await Promise.all([
      this.prisma.charge.findMany({ where: { organizationId, studentId }, orderBy: { dueDate: "desc" } }),
      this.prisma.payment.findMany({ where: { organizationId, studentId }, orderBy: { createdAt: "desc" } }),
    ]);

    const totalOwed = charges
      .filter((c) => c.status === "pending" || c.status === "overdue")
      .reduce((sum, c) => sum + c.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalOwed,
      totalPaid,
      balance: totalOwed,
      charges: charges.map((c) => ({
        id: c.id,
        amount: c.amount,
        currency: c.currency,
        description: c.description,
        dueDate: c.dueDate,
        status: c.status,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        date: p.createdAt,
        method: p.paymentMethod,
      })),
    };
  }

  async getStudentDashboard(organizationId: string, studentId: string) {
    const student = await this.getStudentOrThrow(organizationId, studentId);
    const [groups, attendance, homework, payments] = await Promise.all([
      this.getEnrolledGroups(organizationId, studentId),
      this.attendanceService.findForStudent(organizationId, studentId),
      this.homeworkService.getStudentHomework(organizationId, studentId),
      this.getStudentPayments(organizationId, studentId),
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
        emergencyContact: student.emergencyContact,
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
