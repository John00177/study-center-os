import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AnalyticsQueryDto, AttendanceAnalyticsQueryDto } from "./dto/analytics-query.dto";

const LOW_ATTENDANCE_THRESHOLD = 70;

function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthsAgo(n: number, from = new Date()) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - n, 1));
}

function daysAgo(n: number, from = new Date()) {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function safeDiv(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Revenue ----

  async getRevenueAnalytics(organizationId: string, filters: AnalyticsQueryDto) {
    const start = filters.startDate ? new Date(filters.startDate) : daysAgo(30);
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    const branchWhere = filters.branchId ? { branchId: filters.branchId } : {};

    const [paymentAgg, chargeAgg, outstandingAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { organizationId, createdAt: { gte: start, lte: end }, ...branchWhere },
        _sum: { amount: true },
      }),
      this.prisma.charge.aggregate({
        where: { organizationId, createdAt: { gte: start, lte: end }, ...branchWhere },
        _sum: { amount: true },
      }),
      this.prisma.charge.aggregate({
        where: { organizationId, status: { in: ["pending", "overdue"] }, ...branchWhere },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = paymentAgg._sum.amount ?? 0;
    const totalCharges = chargeAgg._sum.amount ?? 0;

    const dailyRevenue = await this.prisma.$queryRaw<{ day: Date; amount: number }[]>`
      SELECT date_trunc('day', created_at) AS day, COALESCE(SUM(amount), 0)::float AS amount
      FROM payments
      WHERE organization_id = ${organizationId} AND created_at >= ${daysAgo(30)}
      GROUP BY day
      ORDER BY day ASC
    `;

    const monthlyRevenue = await this.prisma.$queryRaw<{ month: Date; amount: number }[]>`
      SELECT date_trunc('month', created_at) AS month, COALESCE(SUM(amount), 0)::float AS amount
      FROM payments
      WHERE organization_id = ${organizationId} AND created_at >= ${monthsAgo(11)}
      GROUP BY month
      ORDER BY month ASC
    `;

    const [byBranch, byMethod, branches] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ["branchId"],
        where: { organizationId, createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ["paymentMethod"],
        where: { organizationId, createdAt: { gte: start, lte: end }, ...branchWhere },
        _sum: { amount: true },
      }),
      this.prisma.branch.findMany({ where: { organizationId } }),
    ]);
    const branchById = new Map(branches.map((b) => [b.id, b]));

    return {
      totalRevenue,
      totalCharges,
      collectionRate: safeDiv(totalRevenue, totalCharges) * 100,
      outstandingBalance: outstandingAgg._sum.amount ?? 0,
      dailyRevenue: dailyRevenue.map((r) => ({ date: r.day.toISOString().slice(0, 10), amount: r.amount })),
      monthlyRevenue: monthlyRevenue.map((r) => ({ month: r.month.toISOString().slice(0, 7), amount: r.amount })),
      revenueByBranch: byBranch.map((row) => ({
        branchId: row.branchId,
        branchName: branchById.get(row.branchId)?.name ?? "Unknown",
        amount: row._sum.amount ?? 0,
      })),
      revenueByPaymentMethod: byMethod.map((row) => ({
        method: row.paymentMethod,
        amount: row._sum.amount ?? 0,
      })),
    };
  }

  // ---- Enrollment ----

  async getEnrollmentAnalytics(organizationId: string, filters: AnalyticsQueryDto) {
    const [totalStudents, totalNewcomers, totalDropped, totalCompleted] = await Promise.all([
      this.prisma.student.count({ where: { organizationId, status: "active" } }),
      this.prisma.student.count({ where: { organizationId, status: "newcomer" } }),
      this.prisma.student.count({ where: { organizationId, status: "dropped" } }),
      this.prisma.student.count({ where: { organizationId, status: "completed" } }),
    ]);

    // Approximation: "dropped this month" uses updatedAt as a proxy for the
    // status-change date since Student has no dedicated droppedAt field.
    const newByMonth = await this.prisma.$queryRaw<{ month: Date; count: bigint }[]>`
      SELECT date_trunc('month', registered_at) AS month, COUNT(*)::int AS count
      FROM students
      WHERE organization_id = ${organizationId} AND registered_at >= ${monthsAgo(11)}
      GROUP BY month ORDER BY month ASC
    `;
    const droppedByMonth = await this.prisma.$queryRaw<{ month: Date; count: bigint }[]>`
      SELECT date_trunc('month', updated_at) AS month, COUNT(*)::int AS count
      FROM students
      WHERE organization_id = ${organizationId} AND status = 'dropped' AND updated_at >= ${monthsAgo(11)}
      GROUP BY month ORDER BY month ASC
    `;
    const newByMonthMap = new Map(newByMonth.map((r) => [r.month.toISOString().slice(0, 7), Number(r.count)]));
    const droppedByMonthMap = new Map(droppedByMonth.map((r) => [r.month.toISOString().slice(0, 7), Number(r.count)]));
    const months = [...new Set([...newByMonthMap.keys(), ...droppedByMonthMap.keys()])].sort();
    const enrollmentTrend = months.map((month) => {
      const newStudents = newByMonthMap.get(month) ?? 0;
      const droppedStudents = droppedByMonthMap.get(month) ?? 0;
      return { month, newStudents, droppedStudents, netChange: newStudents - droppedStudents };
    });

    // Students have no direct branchId — derive it via active group
    // memberships (a student in multiple branches' groups is counted once
    // per branch they're actively enrolled in).
    const memberships = await this.prisma.groupMembership.findMany({
      where: { organizationId, status: "active" },
    });
    const groupIds = [...new Set(memberships.map((m) => m.groupId))];
    const groups = groupIds.length ? await this.prisma.group.findMany({ where: { id: { in: groupIds } } }) : [];
    const groupById = new Map(groups.map((g) => [g.id, g]));
    const branches = await this.prisma.branch.findMany({ where: { organizationId } });
    const branchById = new Map(branches.map((b) => [b.id, b]));
    const courseIds = [...new Set(groups.map((g) => g.courseId))];
    const courses = courseIds.length ? await this.prisma.course.findMany({ where: { id: { in: courseIds } } }) : [];
    const courseById = new Map(courses.map((c) => [c.id, c]));

    const studentBranches = new Map<string, Set<string>>();
    const studentCourses = new Map<string, Set<string>>();
    for (const m of memberships) {
      const group = groupById.get(m.groupId);
      if (!group) continue;
      if (!studentBranches.has(group.branchId)) studentBranches.set(group.branchId, new Set());
      studentBranches.get(group.branchId)!.add(m.studentId);
      if (!studentCourses.has(group.courseId)) studentCourses.set(group.courseId, new Set());
      studentCourses.get(group.courseId)!.add(m.studentId);
    }

    const studentsByBranch = [...studentBranches.entries()]
      .filter(([branchId]) => !filters.branchId || branchId === filters.branchId)
      .map(([branchId, studentIds]) => ({
        branchId,
        branchName: branchById.get(branchId)?.name ?? "Unknown",
        count: studentIds.size,
      }));
    const studentsByCourse = [...studentCourses.entries()].map(([courseId, studentIds]) => ({
      courseId,
      courseName: courseById.get(courseId)?.name ?? "Unknown",
      count: studentIds.size,
    }));

    const convertedByMonth = await this.prisma.$queryRaw<{ month: Date; count: bigint }[]>`
      SELECT date_trunc('month', converted_at) AS month, COUNT(*)::int AS count
      FROM students
      WHERE organization_id = ${organizationId} AND converted_at IS NOT NULL AND converted_at >= ${monthsAgo(11)}
      GROUP BY month ORDER BY month ASC
    `;
    const convertedByMonthMap = new Map(convertedByMonth.map((r) => [r.month.toISOString().slice(0, 7), Number(r.count)]));
    const newcomerConversionTrend = months.map((month) => ({
      month,
      newcomers: newByMonthMap.get(month) ?? 0,
      converted: convertedByMonthMap.get(month) ?? 0,
    }));

    return {
      totalStudents,
      totalNewcomers,
      totalDropped,
      totalCompleted,
      conversionRate: safeDiv(totalStudents, totalStudents + totalNewcomers) * 100,
      enrollmentTrend,
      studentsByBranch,
      studentsByCourse,
      newcomerConversionTrend,
    };
  }

  // ---- Teachers ----

  async getTeacherAnalytics(organizationId: string, filters: AnalyticsQueryDto) {
    const start = filters.startDate ? new Date(filters.startDate) : daysAgo(30);
    const end = filters.endDate ? new Date(filters.endDate) : new Date();

    const teachers = await this.prisma.teacher.findMany({ where: { organizationId } });
    const dashboardAccess = await this.prisma.teacherDashboardAccess.findMany({
      where: { organizationId, status: "active" },
    });
    const activeTeacherIds = new Set(dashboardAccess.map((a) => a.teacherId));

    const assignments = await this.prisma.groupTeacherAssignment.findMany({
      where: { organizationId, status: "active" },
    });
    const groupIdsByTeacher = new Map<string, string[]>();
    for (const a of assignments) {
      const list = groupIdsByTeacher.get(a.teacherId) ?? [];
      list.push(a.groupId);
      groupIdsByTeacher.set(a.teacherId, list);
    }

    const allGroupIds = [...new Set(assignments.map((a) => a.groupId))];
    const memberships = allGroupIds.length
      ? await this.prisma.groupMembership.findMany({
          where: { organizationId, groupId: { in: allGroupIds }, status: "active" },
        })
      : [];
    const studentIdsByGroup = new Map<string, Set<string>>();
    for (const m of memberships) {
      if (!studentIdsByGroup.has(m.groupId)) studentIdsByGroup.set(m.groupId, new Set());
      studentIdsByGroup.get(m.groupId)!.add(m.studentId);
    }

    const attendanceSessions = allGroupIds.length
      ? await this.prisma.attendance.findMany({
          where: { organizationId, groupId: { in: allGroupIds }, date: { gte: start, lte: end }, ...(filters.branchId ? { branchId: filters.branchId } : {}) },
        })
      : [];
    const sessionKeysByGroup = new Map<string, Set<string>>();
    for (const rec of attendanceSessions) {
      const key = `${rec.date.toISOString()}`;
      if (!sessionKeysByGroup.has(rec.groupId)) sessionKeysByGroup.set(rec.groupId, new Set());
      sessionKeysByGroup.get(rec.groupId)!.add(key);
    }

    const lessons = allGroupIds.length
      ? await this.prisma.lesson.findMany({
          where: { organizationId, teacherId: { in: teachers.map((t) => t.id) }, date: { gte: start, lte: end } },
        })
      : [];
    const lessonCountByTeacher = new Map<string, number>();
    for (const lesson of lessons) {
      lessonCountByTeacher.set(lesson.teacherId, (lessonCountByTeacher.get(lesson.teacherId) ?? 0) + 1);
    }

    const teacherWorkload = teachers.map((teacher) => {
      const groupIds = groupIdsByTeacher.get(teacher.id) ?? [];
      const studentIds = new Set<string>();
      let attendanceSessionsCount = 0;
      for (const groupId of groupIds) {
        for (const sid of studentIdsByGroup.get(groupId) ?? []) studentIds.add(sid);
        attendanceSessionsCount += sessionKeysByGroup.get(groupId)?.size ?? 0;
      }
      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        groupCount: groupIds.length,
        studentCount: studentIds.size,
        attendanceSessions: attendanceSessionsCount,
        lessonNotesCount: lessonCountByTeacher.get(teacher.id) ?? 0,
      };
    });

    const topTeachersByAttendance = [...teacherWorkload]
      .sort((a, b) => b.attendanceSessions - a.attendanceSessions)
      .slice(0, 10)
      .map((t) => ({ teacherId: t.teacherId, teacherName: t.teacherName, sessionsCount: t.attendanceSessions }));

    const totalStudentsAcrossTeachers = teacherWorkload.reduce((sum, t) => sum + t.studentCount, 0);

    return {
      totalTeachers: teachers.length,
      activeTeachers: activeTeacherIds.size,
      teacherWorkload,
      topTeachersByAttendance,
      averageStudentsPerTeacher: safeDiv(totalStudentsAcrossTeachers, teachers.length),
    };
  }

  // ---- Attendance ----

  async getAttendanceAnalytics(organizationId: string, filters: AttendanceAnalyticsQueryDto) {
    const start = filters.startDate ? new Date(filters.startDate) : daysAgo(30);
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    const where: Prisma.AttendanceWhereInput = {
      organizationId,
      date: { gte: start, lte: end },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.groupId ? { groupId: filters.groupId } : {}),
    };

    const byStatus = await this.prisma.attendance.groupBy({ by: ["status"], where, _count: { _all: true } });
    const countByStatus = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
    const presentCount = countByStatus.present ?? 0;
    const absentCount = countByStatus.absent ?? 0;
    const lateCount = countByStatus.late ?? 0;
    const excusedCount = countByStatus.excused ?? 0;
    const total = presentCount + absentCount + lateCount + excusedCount;

    const dailyRateRows = await this.prisma.$queryRaw<{ day: Date; present: bigint; total: bigint }[]>`
      SELECT date_trunc('day', date) AS day,
             COUNT(*) FILTER (WHERE status = 'present')::int AS present,
             COUNT(*)::int AS total
      FROM attendances
      WHERE organization_id = ${organizationId} AND date >= ${start} AND date <= ${end}
        ${filters.branchId ? Prisma.sql`AND branch_id = ${filters.branchId}` : Prisma.empty}
        ${filters.groupId ? Prisma.sql`AND group_id = ${filters.groupId}` : Prisma.empty}
      GROUP BY day ORDER BY day ASC
    `;
    const dailyRate = dailyRateRows.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      rate: safeDiv(Number(r.present), Number(r.total)) * 100,
    }));

    const records = await this.prisma.attendance.findMany({ where });
    const groups = await this.prisma.group.findMany({ where: { organizationId } });
    const groupById = new Map(groups.map((g) => [g.id, g]));
    const branches = await this.prisma.branch.findMany({ where: { organizationId } });
    const branchById = new Map(branches.map((b) => [b.id, b]));

    const byGroupAcc = new Map<string, { present: number; total: number }>();
    const byBranchAcc = new Map<string, { present: number; total: number }>();
    const byStudentAcc = new Map<string, { present: number; total: number; groupId: string }>();
    for (const rec of records) {
      const g = byGroupAcc.get(rec.groupId) ?? { present: 0, total: 0 };
      g.total += 1;
      if (rec.status === "present") g.present += 1;
      byGroupAcc.set(rec.groupId, g);

      const b = byBranchAcc.get(rec.branchId) ?? { present: 0, total: 0 };
      b.total += 1;
      if (rec.status === "present") b.present += 1;
      byBranchAcc.set(rec.branchId, b);

      const s = byStudentAcc.get(rec.studentId) ?? { present: 0, total: 0, groupId: rec.groupId };
      s.total += 1;
      if (rec.status === "present") s.present += 1;
      byStudentAcc.set(rec.studentId, s);
    }

    const rateByGroup = [...byGroupAcc.entries()].map(([groupId, v]) => ({
      groupId,
      groupName: groupById.get(groupId)?.name ?? "Unknown",
      rate: safeDiv(v.present, v.total) * 100,
    }));
    const rateByBranch = [...byBranchAcc.entries()].map(([branchId, v]) => ({
      branchId,
      branchName: branchById.get(branchId)?.name ?? "Unknown",
      rate: safeDiv(v.present, v.total) * 100,
    }));

    const lowAttendanceEntries = [...byStudentAcc.entries()]
      .map(([studentId, v]) => ({ studentId, rate: safeDiv(v.present, v.total) * 100, groupId: v.groupId }))
      .filter((s) => s.rate < LOW_ATTENDANCE_THRESHOLD);
    const lowStudentIds = lowAttendanceEntries.map((s) => s.studentId);
    const lowStudents = lowStudentIds.length
      ? await this.prisma.student.findMany({ where: { id: { in: lowStudentIds } } })
      : [];
    const lowStudentById = new Map(lowStudents.map((s) => [s.id, s]));
    const lowAttendanceStudents = lowAttendanceEntries
      .map((s) => ({
        studentId: s.studentId,
        studentName: lowStudentById.get(s.studentId)?.name ?? "Unknown",
        rate: s.rate,
        groupName: groupById.get(s.groupId)?.name ?? "Unknown",
      }))
      .sort((a, b) => a.rate - b.rate);

    return {
      overallRate: safeDiv(presentCount, total) * 100,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      dailyRate,
      rateByGroup,
      rateByBranch,
      lowAttendanceStudents,
    };
  }

  // ---- Finance health ----

  async getFinanceHealth(organizationId: string) {
    const accounts = await this.prisma.financialAccount.findMany({ where: { organizationId } });
    const transactions = await this.prisma.financialTransaction.findMany({ where: { organizationId } });
    const totalCashOnHand = transactions.reduce(
      (sum, t) => sum + t.amount * (t.direction === "credit" ? 1 : -1),
      0,
    );
    void accounts; // balances are derived from the transaction ledger, not stored on the account itself

    const threeMonthsAgo = monthsAgo(3);
    const recentDebits = transactions.filter((t) => t.direction === "debit" && t.createdAt >= threeMonthsAgo);
    const monthlyBurnRate = safeDiv(
      recentDebits.reduce((sum, t) => sum + t.amount, 0),
      3,
    );
    const runwayMonths = monthlyBurnRate > 0 ? totalCashOnHand / monthlyBurnRate : null;

    const [overdueAgg, thisMonthPaymentAgg, thisMonthChargeAgg] = await Promise.all([
      this.prisma.charge.aggregate({
        where: { organizationId, status: "overdue" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: { organizationId, createdAt: { gte: startOfMonth() } },
        _sum: { amount: true },
      }),
      this.prisma.charge.aggregate({
        where: { organizationId, createdAt: { gte: startOfMonth() } },
        _sum: { amount: true },
      }),
    ]);

    const thisMonthRevenue = thisMonthPaymentAgg._sum.amount ?? 0;
    const thisMonthCharges = thisMonthChargeAgg._sum.amount ?? 0;

    return {
      totalCashOnHand,
      monthlyBurnRate,
      runwayMonths,
      overdueChargesCount: overdueAgg._count._all,
      overdueChargesAmount: overdueAgg._sum.amount ?? 0,
      thisMonthRevenue,
      thisMonthCharges,
      thisMonthCollectionRate: safeDiv(thisMonthRevenue, thisMonthCharges) * 100,
    };
  }

  // ---- Quick stats (dashboard widgets) ----

  async getQuickStats(organizationId: string) {
    const since7d = daysAgo(7);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const [newcomersThisWeek, conversionsThisWeek, submissionsByStatus, todayAttendance] = await Promise.all([
      this.prisma.student.count({ where: { organizationId, registeredAt: { gte: since7d } } }),
      this.prisma.student.count({ where: { organizationId, convertedAt: { gte: since7d } } }),
      this.prisma.homeworkSubmission.groupBy({ by: ["status"], where: { organizationId }, _count: { _all: true } }),
      this.prisma.attendance.groupBy({
        by: ["status"],
        where: { organizationId, date: { gte: todayStart, lte: todayEnd } },
        _count: { _all: true },
      }),
    ]);

    const submissionCounts = Object.fromEntries(submissionsByStatus.map((r) => [r.status, r._count._all]));
    const totalSubmissions = Object.values(submissionCounts).reduce((sum: number, n) => sum + (n as number), 0);
    const completedSubmissions = (submissionCounts.submitted ?? 0) + (submissionCounts.graded ?? 0);

    const attendanceCounts = Object.fromEntries(todayAttendance.map((r) => [r.status, r._count._all]));
    const todayPresent = attendanceCounts.present ?? 0;
    const todayTotal = Object.values(attendanceCounts).reduce((sum: number, n) => sum + (n as number), 0);

    return {
      newcomersThisWeek,
      conversionsThisWeek,
      homeworkCompletionRate: safeDiv(completedSubmissions, totalSubmissions) * 100,
      todayAttendanceRate: safeDiv(todayPresent, todayTotal) * 100,
    };
  }

  // ---- Newcomer conversion funnel ----

  async getNewcomerConversionFunnel(organizationId: string) {
    const since = startOfMonth();
    const newcomersThisMonth = await this.prisma.student.findMany({
      where: { organizationId, registeredAt: { gte: since } },
    });
    const converted = newcomersThisMonth.filter((s) => s.convertedAt);

    const totalDays = converted.reduce((sum, s) => {
      const days = (s.convertedAt!.getTime() - s.registeredAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return {
      totalNewcomersThisMonth: newcomersThisMonth.length,
      convertedToActive: converted.length,
      conversionRate: safeDiv(converted.length, newcomersThisMonth.length) * 100,
      avgDaysToConvert: converted.length > 0 ? totalDays / converted.length : null,
      // Not tracked yet: Student has no "source" field to attribute conversions to.
      topConversionSources: [] as { source: string; count: number }[],
    };
  }
}
