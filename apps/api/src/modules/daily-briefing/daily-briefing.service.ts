import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { getQuoteOfTheDay } from "./quotes";
import type {
  BriefingAction,
  OwnerBriefing,
  ParentBriefing,
  PlatformAdminBriefing,
  ReceptionBriefing,
  StudentBriefing,
  TeacherBriefing,
} from "./daily-briefing.types";

const CACHE_TTL_MS = 5 * 60 * 1000;

function todayRange(now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

function greetingFor(hour: number, name?: string): string {
  const salutation = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name ? `${salutation}, ${name}!` : `${salutation}!`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

@Injectable()
export class DailyBriefingService {
  private readonly cache = new Map<string, { data: unknown; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  private async cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data as T;
    }
    const data = await compute();
    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }

  // ---- Owner / Admin / Reception ----

  async getOwnerBriefing(organizationId: string, userName: string): Promise<OwnerBriefing> {
    return this.cached(`owner:${organizationId}`, async () => {
      const now = new Date();
      const { start, end } = todayRange(now);
      const dayOfWeek = now.getUTCDay();

      const [todayClassesCount, activeStudents, pendingPayments, pendingApprovals, lowAttendanceCount] =
        await Promise.all([
          this.prisma.schedule.count({ where: { organizationId, dayOfWeek } }),
          this.prisma.groupMembership.count({ where: { organizationId, status: "active" } }),
          this.prisma.charge.count({ where: { organizationId, status: { in: ["pending", "overdue"] } } }),
          this.prisma.student.count({ where: { organizationId, status: "newcomer" } }),
          this.lowAttendanceStudentCount(organizationId),
        ]);

      void start;
      void end;

      const actions: BriefingAction[] = [
        { label: `${pendingPayments} payments awaiting collection`, href: "/finance/overdue", urgent: pendingPayments > 0 },
        { label: `${pendingApprovals} newcomers awaiting conversion`, href: "/newcomers", urgent: pendingApprovals > 0 },
        { label: `${lowAttendanceCount} students with low attendance`, href: "/attendance", urgent: lowAttendanceCount > 0 },
      ];

      return {
        greeting: greetingFor(now.getUTCHours(), userName),
        date: formatDate(now),
        quote: getQuoteOfTheDay(now),
        stats: {
          todayClasses: todayClassesCount,
          todayStudents: activeStudents,
          pendingPayments,
          pendingApprovals,
          lowAttendanceAlert: lowAttendanceCount,
        },
        actions,
      };
    });
  }

  async getReceptionBriefing(organizationId: string, userName: string): Promise<ReceptionBriefing> {
    return this.cached(`reception:${organizationId}`, async () => {
      const now = new Date();
      const { start, end } = todayRange(now);
      const dayOfWeek = now.getUTCDay();

      const [todayNewcomers, pendingConversions, overduePayments, todayClassesCount] = await Promise.all([
        this.prisma.student.count({ where: { organizationId, status: "newcomer", registeredAt: { gte: start, lte: end } } }),
        this.prisma.student.count({ where: { organizationId, status: "newcomer" } }),
        this.prisma.charge.count({ where: { organizationId, status: "overdue" } }),
        this.prisma.schedule.count({ where: { organizationId, dayOfWeek } }),
      ]);

      const actions: BriefingAction[] = [
        { label: `${pendingConversions} newcomers to follow up`, href: "/reception/newcomers", urgent: pendingConversions > 0 },
        { label: `${overduePayments} overdue payments`, href: "/reception/finance/overdue", urgent: overduePayments > 0 },
      ];

      return {
        greeting: greetingFor(now.getUTCHours(), userName),
        date: formatDate(now),
        quote: getQuoteOfTheDay(now),
        stats: { todayNewcomers, pendingConversions, overduePayments, todayClasses: todayClassesCount },
        actions,
      };
    });
  }

  // HomeworkSubmission only stores homeworkId (no Prisma relation to Homework
  // is declared in the schema), so filtering by the student's groups needs an
  // explicit two-step lookup instead of a nested where.
  private async pendingHomeworkCount(organizationId: string, studentId: string, groupIds: string[]): Promise<number> {
    if (groupIds.length === 0) return 0;
    const homework = await this.prisma.homework.findMany({
      where: { organizationId, groupId: { in: groupIds }, status: "active" },
      select: { id: true },
    });
    if (homework.length === 0) return 0;
    return this.prisma.homeworkSubmission.count({
      where: { studentId, organizationId, status: "pending", homeworkId: { in: homework.map((h) => h.id) } },
    });
  }

  private async lowAttendanceStudentCount(organizationId: string): Promise<number> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);
    const records = await this.prisma.attendance.findMany({
      where: { organizationId, date: { gte: since } },
      select: { studentId: true, status: true },
    });
    const byStudent = new Map<string, { present: number; total: number }>();
    for (const rec of records) {
      const acc = byStudent.get(rec.studentId) ?? { present: 0, total: 0 };
      acc.total += 1;
      if (rec.status === "present") acc.present += 1;
      byStudent.set(rec.studentId, acc);
    }
    let count = 0;
    for (const { present, total } of byStudent.values()) {
      if (total > 0 && present / total < 0.7) count += 1;
    }
    return count;
  }

  // ---- Teacher ----

  async getTeacherBriefing(organizationId: string, teacherId: string, userName: string): Promise<TeacherBriefing> {
    return this.cached(`teacher:${organizationId}:${teacherId}`, async () => {
      const now = new Date();
      const { start, end } = todayRange(now);
      const dayOfWeek = now.getUTCDay();

      const assignments = await this.prisma.groupTeacherAssignment.findMany({
        where: { organizationId, teacherId, status: "active" },
      });
      const groupIds = [...new Set(assignments.map((a) => a.groupId))];

      const [groups, schedules, memberships, homeworkDue, attendancePending, testsToGrade] = await Promise.all([
        groupIds.length ? this.prisma.group.findMany({ where: { id: { in: groupIds } } }) : Promise.resolve([]),
        groupIds.length
          ? this.prisma.schedule.findMany({ where: { groupId: { in: groupIds }, dayOfWeek }, orderBy: { startTime: "asc" } })
          : Promise.resolve([]),
        groupIds.length
          ? this.prisma.groupMembership.findMany({ where: { groupId: { in: groupIds }, status: "active" } })
          : Promise.resolve([]),
        groupIds.length
          ? this.prisma.homework.count({ where: { groupId: { in: groupIds }, status: "active", dueDate: { gte: now } } })
          : Promise.resolve(0),
        groupIds.length
          ? this.prisma.attendance.count({ where: { groupId: { in: groupIds }, date: { gte: start, lte: end } } }).then(
              async (marked) => groupIds.length - Math.min(marked, groupIds.length),
            )
          : Promise.resolve(0),
        this.prisma.test.count({ where: { organizationId, teacherId, status: "published" } }),
      ]);

      const groupById = new Map(groups.map((g) => [g.id, g]));
      const studentIds = new Set(memberships.map((m) => m.studentId));

      const classrooms = schedules.some((s) => s.classroomId)
        ? await this.prisma.classroom.findMany({
            where: { id: { in: schedules.map((s) => s.classroomId).filter((id): id is string => !!id) } },
          })
        : [];
      const classroomById = new Map(classrooms.map((c) => [c.id, c]));

      const nextSchedule = schedules[0];
      const nextClass = nextSchedule
        ? {
            groupName: groupById.get(nextSchedule.groupId)?.name ?? "Group",
            time: nextSchedule.startTime,
            classroom: nextSchedule.classroomId ? classroomById.get(nextSchedule.classroomId)?.name ?? "—" : "—",
            studentsCount: memberships.filter((m) => m.groupId === nextSchedule.groupId).length,
          }
        : null;

      const actions: BriefingAction[] = [
        { label: `${attendancePending} classes need attendance marked`, href: "/teacher/groups", urgent: attendancePending > 0 },
        { label: `${testsToGrade} tests to review`, href: "/teacher/ai-tests", urgent: testsToGrade > 0 },
      ];

      return {
        greeting: greetingFor(now.getUTCHours(), userName),
        date: formatDate(now),
        quote: getQuoteOfTheDay(now),
        stats: {
          todayClasses: schedules.length,
          totalStudents: studentIds.size,
          attendancePending,
          homeworkDue,
          testsToGrade,
        },
        actions,
        nextClass,
      };
    });
  }

  // ---- Student ----

  async getStudentBriefing(organizationId: string, studentId: string): Promise<StudentBriefing> {
    return this.cached(`student:${organizationId}:${studentId}`, async () => {
      const now = new Date();
      const dayOfWeek = now.getUTCDay();

      const [student, memberships] = await Promise.all([
        this.prisma.student.findFirst({ where: { id: studentId, organizationId } }),
        this.prisma.groupMembership.findMany({ where: { studentId, organizationId, status: "active" } }),
      ]);
      const groupIds = memberships.map((m) => m.groupId);

      const [groups, schedules, pendingHomework, attendanceRecords, pendingCharges] = await Promise.all([
        groupIds.length ? this.prisma.group.findMany({ where: { id: { in: groupIds } } }) : Promise.resolve([]),
        groupIds.length
          ? this.prisma.schedule.findMany({ where: { groupId: { in: groupIds }, dayOfWeek }, orderBy: { startTime: "asc" } })
          : Promise.resolve([]),
        this.pendingHomeworkCount(organizationId, studentId, groupIds),
        this.prisma.attendance.findMany({ where: { studentId, organizationId }, select: { status: true } }),
        this.prisma.charge.aggregate({
          where: { studentId, organizationId, status: { in: ["pending", "overdue"] } },
          _sum: { amount: true },
        }),
      ]);

      const groupById = new Map(groups.map((g) => [g.id, g]));
      const present = attendanceRecords.filter((r) => r.status === "present").length;
      const attendanceRate = attendanceRecords.length > 0 ? (present / attendanceRecords.length) * 100 : 0;

      const classrooms = schedules.some((s) => s.classroomId)
        ? await this.prisma.classroom.findMany({
            where: { id: { in: schedules.map((s) => s.classroomId).filter((id): id is string => !!id) } },
          })
        : [];
      const classroomById = new Map(classrooms.map((c) => [c.id, c]));
      const nextSchedule = schedules[0];
      const nextClass = nextSchedule
        ? {
            groupName: groupById.get(nextSchedule.groupId)?.name ?? "Group",
            time: nextSchedule.startTime,
            classroom: nextSchedule.classroomId ? classroomById.get(nextSchedule.classroomId)?.name ?? "—" : "—",
          }
        : null;

      const balanceDue = pendingCharges._sum.amount ?? 0;
      const actions: BriefingAction[] = [
        { label: `${pendingHomework} homework tasks due`, href: "/student/homework", urgent: pendingHomework > 0 },
        { label: `Balance due: ${balanceDue}`, href: "/student/payments", urgent: balanceDue > 0 },
      ];

      return {
        greeting: greetingFor(now.getUTCHours(), student?.name),
        date: formatDate(now),
        quote: getQuoteOfTheDay(now),
        stats: {
          todayClasses: schedules.length,
          pendingHomework,
          attendanceRate,
          balanceDue,
        },
        actions,
        nextClass,
      };
    });
  }

  // ---- Parent ----

  async getParentBriefing(organizationId: string, studentId: string): Promise<ParentBriefing> {
    return this.cached(`parent:${organizationId}:${studentId}`, async () => {
      const now = new Date();
      const dayOfWeek = now.getUTCDay();

      const [student, memberships] = await Promise.all([
        this.prisma.student.findFirst({ where: { id: studentId, organizationId } }),
        this.prisma.groupMembership.findMany({ where: { studentId, organizationId, status: "active" } }),
      ]);
      const groupIds = memberships.map((m) => m.groupId);

      const [groups, schedules, pendingHomework, attendanceRecords, pendingCharges, assignments] = await Promise.all([
        groupIds.length ? this.prisma.group.findMany({ where: { id: { in: groupIds } } }) : Promise.resolve([]),
        groupIds.length
          ? this.prisma.schedule.findMany({ where: { groupId: { in: groupIds }, dayOfWeek }, orderBy: { startTime: "asc" } })
          : Promise.resolve([]),
        this.pendingHomeworkCount(organizationId, studentId, groupIds),
        this.prisma.attendance.findMany({ where: { studentId, organizationId }, select: { status: true } }),
        this.prisma.charge.aggregate({
          where: { studentId, organizationId, status: { in: ["pending", "overdue"] } },
          _sum: { amount: true },
        }),
        groupIds.length
          ? this.prisma.groupTeacherAssignment.findMany({ where: { groupId: { in: groupIds }, status: "active" } })
          : Promise.resolve([]),
      ]);

      const groupById = new Map(groups.map((g) => [g.id, g]));
      const present = attendanceRecords.filter((r) => r.status === "present").length;
      const attendanceRate = attendanceRecords.length > 0 ? (present / attendanceRecords.length) * 100 : 0;

      const classrooms = schedules.some((s) => s.classroomId)
        ? await this.prisma.classroom.findMany({
            where: { id: { in: schedules.map((s) => s.classroomId).filter((id): id is string => !!id) } },
          })
        : [];
      const classroomById = new Map(classrooms.map((c) => [c.id, c]));
      const nextSchedule = schedules[0];
      const nextClass = nextSchedule
        ? {
            groupName: groupById.get(nextSchedule.groupId)?.name ?? "Group",
            time: nextSchedule.startTime,
            classroom: nextSchedule.classroomId ? classroomById.get(nextSchedule.classroomId)?.name ?? "—" : "—",
          }
        : null;

      const teacherIds = [...new Set(assignments.map((a) => a.teacherId))];
      const teachers = teacherIds.length ? await this.prisma.teacher.findMany({ where: { id: { in: teacherIds } } }) : [];
      const teacherContacts = teachers.map((t) => ({ name: t.name, email: t.email, phone: t.phone }));

      const balanceDue = pendingCharges._sum.amount ?? 0;
      const actions: BriefingAction[] = [
        { label: `${pendingHomework} homework tasks due`, href: "/parent/homework", urgent: pendingHomework > 0 },
        { label: `Balance due: ${balanceDue}`, href: "/parent/payments", urgent: balanceDue > 0 },
      ];

      return {
        greeting: greetingFor(now.getUTCHours()),
        date: formatDate(now),
        quote: getQuoteOfTheDay(now),
        stats: {
          childName: student?.name ?? "",
          todayClasses: schedules.length,
          attendanceRate,
          pendingHomework,
          balanceDue,
        },
        actions,
        nextClass,
        teacherContacts,
      };
    });
  }

  // ---- Platform admin ----

  async getPlatformAdminBriefing(userName: string): Promise<PlatformAdminBriefing> {
    return this.cached("platform-admin", async () => {
      const now = new Date();

      const [totalOrgs, pendingApprovals, revenueAgg, activeStudents] = await Promise.all([
        this.prisma.organization.count(),
        this.prisma.organization.count({ where: { status: "pending" } }),
        this.prisma.platformPayment.aggregate({ _sum: { amount: true } }),
        this.prisma.student.count({ where: { status: "active" } }),
      ]);

      const totalRevenue = revenueAgg._sum.amount ?? 0;
      const actions: BriefingAction[] = [
        { label: `${pendingApprovals} organizations awaiting approval`, href: "/admin/applications", urgent: pendingApprovals > 0 },
        { label: "View platform revenue", href: "/admin/revenue", urgent: false },
      ];

      return {
        greeting: greetingFor(now.getUTCHours(), userName),
        date: formatDate(now),
        quote: getQuoteOfTheDay(now),
        stats: { totalOrgs, pendingApprovals, totalRevenue, activeStudents },
        actions,
      };
    });
  }
}
