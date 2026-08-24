import { Banknote, ClipboardCheck, Download, HandCoins, TrendingUp, UsersRound } from "lucide-react";
import { useState } from "react";
import { RevenueChart } from "../components/charts/RevenueChart";
import { RevenueVsSalaryChart } from "../components/charts/RevenueVsSalaryChart";
import { EnrollmentChart } from "../components/charts/EnrollmentChart";
import { RateTrendChart } from "../components/charts/RateTrendChart";
import { KpiCard } from "../components/analytics/KpiCard";
import { DataTable } from "../components/DataTable";
import { SelectField } from "../components/form/Field";
import { useBranches } from "../hooks/use-branches";
import { useUserRole } from "../stores/auth.store";
import { useOverdueCharges } from "../hooks/use-reminders";
import {
  AnalyticsFilters,
  useAttendanceAnalytics,
  useEnrollmentAnalytics,
  useRevenueAnalytics,
  useTeacherAnalytics,
} from "../hooks/use-analytics";
import { useSalaryAnalytics } from "../hooks/use-salary";
import { useCurrentSubscription } from "../hooks/use-subscription";
import { LockedFeaturePage } from "../components/subscription/LockedFeaturePage";
import { parsePlanLockError } from "../lib/plan-lock";
import { exportToCsv } from "../lib/csv";
import { formatCurrency } from "../lib/format";

type TabKey = "overview" | "revenue" | "enrollment" | "teachers" | "attendance";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "revenue", label: "Revenue" },
  { key: "enrollment", label: "Enrollment" },
  { key: "teachers", label: "Teachers" },
  { key: "attendance", label: "Attendance" },
];

function ExportButton<T>({ filename, columns, rows }: { filename: string; columns: { key: string; label: string; value: (r: T) => string | number }[]; rows: T[] | undefined }) {
  return (
    <button
      onClick={() => rows && exportToCsv(filename, columns, rows)}
      disabled={!rows || rows.length === 0}
      className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}

function collectionRateColor(rate: number) {
  if (rate > 80) return "text-green-600";
  if (rate >= 50) return "text-yellow-600";
  return "text-red-600";
}

function OverviewTab({ filters, canViewRevenue }: { filters: AnalyticsFilters; canViewRevenue: boolean }) {
  const { data: revenue } = useRevenueAnalytics(filters, canViewRevenue);
  const { data: enrollment } = useEnrollmentAnalytics(filters);
  const { data: attendance } = useAttendanceAnalytics(filters);
  const { data: teachers } = useTeacherAnalytics(filters);
  const { data: overdueCharges } = useOverdueCharges({ branchId: filters.branchId }, canViewRevenue);

  const monthly = revenue?.monthlyRevenue ?? [];
  const thisMonth = monthly[monthly.length - 1]?.amount ?? 0;
  const lastMonth = monthly[monthly.length - 2]?.amount ?? 0;
  const revenueTrend = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  const enrollmentTrendLast = enrollment?.enrollmentTrend[enrollment.enrollmentTrend.length - 1];
  const studentsTrend =
    enrollmentTrendLast && enrollment && enrollment.totalStudents > 0
      ? (enrollmentTrendLast.netChange / enrollment.totalStudents) * 100
      : null;

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canViewRevenue && (
          <KpiCard
            label="Total Revenue (this month)"
            value={formatCurrency(thisMonth, "UZS")}
            trend={revenueTrend}
            icon={<Banknote size={18} />}
          />
        )}
        <KpiCard
          label="Active Students"
          value={String(enrollment?.totalStudents ?? "-")}
          trend={studentsTrend}
          icon={<UsersRound size={18} />}
        />
        {canViewRevenue && (
          <KpiCard
            label="Collection Rate"
            value={revenue ? `${revenue.collectionRate.toFixed(1)}%` : "-"}
            colorClass={revenue ? collectionRateColor(revenue.collectionRate) : undefined}
            icon={<TrendingUp size={18} />}
          />
        )}
        <KpiCard
          label="Attendance Rate"
          value={attendance ? `${attendance.overallRate.toFixed(1)}%` : "-"}
          icon={<ClipboardCheck size={18} />}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canViewRevenue && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Revenue — last 30 days
            </h3>
            <RevenueChart
              data={(revenue?.dailyRevenue ?? []).map((d) => ({ name: d.date.slice(5), value: d.amount }))}
              valueFormatter={(v) => formatCurrency(v, "UZS")}
            />
          </div>
        )}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Enrollment — new vs dropped (12mo)
          </h3>
          <EnrollmentChart
            data={(enrollment?.enrollmentTrend ?? []).map((t) => ({
              month: t.month.slice(2),
              newStudents: t.newStudents,
              droppedStudents: t.droppedStudents,
            }))}
          />
        </div>
      </div>

      {canViewRevenue && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Revenue by Branch</h3>
              <ExportButton
                filename={`revenue-by-branch-${new Date().toISOString().slice(0, 10)}.csv`}
                rows={revenue?.revenueByBranch}
                columns={[
                  { key: "branchName", label: "Branch", value: (r) => r.branchName },
                  { key: "amount", label: "Revenue", value: (r) => r.amount },
                ]}
              />
            </div>
            <DataTable
              data={revenue?.revenueByBranch}
              isLoading={!revenue}
              emptyMessage="No revenue recorded."
              getRowKey={(r) => r.branchId}
              columns={[
                { header: "Branch", render: (r) => r.branchName },
                { header: "Revenue", render: (r) => formatCurrency(r.amount, "UZS"), align: "right" },
                {
                  header: "% of total",
                  render: (r) => (revenue && revenue.totalRevenue > 0 ? `${((r.amount / revenue.totalRevenue) * 100).toFixed(1)}%` : "-"),
                  align: "right",
                },
              ]}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Overdue Payments</h3>
              <ExportButton
                filename={`overdue-payments-${new Date().toISOString().slice(0, 10)}.csv`}
                rows={overdueCharges?.slice(0, 10)}
                columns={[
                  { key: "student", label: "Student", value: (r) => r.student?.name ?? "-" },
                  { key: "amount", label: "Amount", value: (r) => r.amount },
                  { key: "daysOverdue", label: "Days overdue", value: (r) => r.daysOverdue },
                ]}
              />
            </div>
            <DataTable
              data={overdueCharges?.slice(0, 10)}
              isLoading={!overdueCharges}
              emptyMessage="No overdue payments."
              getRowKey={(c) => c.id}
              columns={[
                { header: "Student", render: (c) => c.student?.name ?? "-" },
                { header: "Amount", render: (c) => formatCurrency(c.amount, c.currency) },
                {
                  header: "Days overdue",
                  render: (c) => (
                    <span className={c.daysOverdue > 7 ? "font-medium text-red-600" : ""}>{c.daysOverdue}</span>
                  ),
                  align: "right",
                },
              ]}
            />
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Teacher Workload</h3>
        <DataTable
          data={teachers?.teacherWorkload}
          isLoading={!teachers}
          emptyMessage="No teachers yet."
          getRowKey={(t) => t.teacherId}
          columns={[
            { header: "Teacher", render: (t) => t.teacherName },
            { header: "Groups", render: (t) => t.groupCount, align: "right" },
            { header: "Students", render: (t) => t.studentCount, align: "right" },
            { header: "Sessions", render: (t) => t.attendanceSessions, align: "right" },
          ]}
        />
      </div>
    </div>
  );
}

function RevenueTab({ filters }: { filters: AnalyticsFilters }) {
  const { data: revenue, isLoading } = useRevenueAnalytics(filters);
  const { data: salaryAnalytics } = useSalaryAnalytics();

  const thisMonthRevenue = revenue?.monthlyRevenue[revenue.monthlyRevenue.length - 1]?.amount ?? 0;
  const salaryExpense = salaryAnalytics?.totalSalaryExpense ?? 0;
  const salaryVsRevenueRatio = thisMonthRevenue > 0 ? (salaryExpense / thisMonthRevenue) * 100 : null;

  const teachersPaidCount = salaryAnalytics?.teacherSalaries.filter((t) => t.thisMonthPaymentStatus === "paid").length ?? 0;
  const teachersTotalCount = salaryAnalytics?.teacherSalaries.length ?? 0;
  const teachersPaidPct = teachersTotalCount > 0 ? (teachersPaidCount / teachersTotalCount) * 100 : 0;

  const revenueByMonth = new Map((revenue?.monthlyRevenue ?? []).map((r) => [r.month, r.amount]));
  const revenueVsSalaryData = (salaryAnalytics?.monthlyHistory ?? []).map((h) => ({
    month: h.month.slice(2),
    revenue: revenueByMonth.get(h.month) ?? 0,
    salary: h.totalPaid + h.totalPending,
  }));

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Revenue" value={revenue ? formatCurrency(revenue.totalRevenue, "UZS") : "-"} />
        <KpiCard label="Total Charges" value={revenue ? formatCurrency(revenue.totalCharges, "UZS") : "-"} />
        <KpiCard
          label="Collection Rate"
          value={revenue ? `${revenue.collectionRate.toFixed(1)}%` : "-"}
          colorClass={revenue ? collectionRateColor(revenue.collectionRate) : undefined}
        />
        <KpiCard label="Outstanding" value={revenue ? formatCurrency(revenue.outstandingBalance, "UZS") : "-"} />
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Daily revenue — last 30 days</h3>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        <RevenueChart
          data={(revenue?.dailyRevenue ?? []).map((d) => ({ name: d.date.slice(5), value: d.amount }))}
          valueFormatter={(v) => formatCurrency(v, "UZS")}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Salary Expense (This Month)"
          value={salaryAnalytics ? formatCurrency(salaryExpense, "UZS") : "-"}
          colorClass="text-red-600"
          icon={<HandCoins size={18} />}
        />
        <KpiCard
          label="Salary vs Revenue"
          value={salaryVsRevenueRatio != null ? `${salaryVsRevenueRatio.toFixed(1)}%` : "-"}
          colorClass={salaryVsRevenueRatio != null && salaryVsRevenueRatio > 50 ? "text-red-600" : "text-slate-900"}
        />
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Teachers Paid / Total</span>
          <p className="mt-1.5 text-xl font-semibold text-slate-900">
            {teachersPaidCount} / {teachersTotalCount}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${teachersPaidPct}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue vs Salary Expense — by month</h3>
        <RevenueVsSalaryChart data={revenueVsSalaryData} valueFormatter={(v) => formatCurrency(v, "UZS")} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">By Branch</h3>
            <ExportButton
              filename={`revenue-by-branch-${new Date().toISOString().slice(0, 10)}.csv`}
              rows={revenue?.revenueByBranch}
              columns={[
                { key: "branchName", label: "Branch", value: (r) => r.branchName },
                { key: "amount", label: "Revenue", value: (r) => r.amount },
              ]}
            />
          </div>
          <DataTable
            data={revenue?.revenueByBranch}
            isLoading={isLoading}
            emptyMessage="No revenue recorded."
            getRowKey={(r) => r.branchId}
            columns={[
              { header: "Branch", render: (r) => r.branchName },
              { header: "Revenue", render: (r) => formatCurrency(r.amount, "UZS"), align: "right" },
            ]}
          />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">By Payment Method</h3>
          <DataTable
            data={revenue?.revenueByPaymentMethod}
            isLoading={isLoading}
            emptyMessage="No payments recorded."
            getRowKey={(r) => r.method}
            columns={[
              { header: "Method", render: (r) => <span className="capitalize">{r.method.replace("_", " ")}</span> },
              { header: "Revenue", render: (r) => formatCurrency(r.amount, "UZS"), align: "right" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function EnrollmentTab({ filters }: { filters: AnalyticsFilters }) {
  const { data: enrollment, isLoading } = useEnrollmentAnalytics(filters);

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Students" value={String(enrollment?.totalStudents ?? "-")} />
        <KpiCard label="Newcomers" value={String(enrollment?.totalNewcomers ?? "-")} />
        <KpiCard label="Dropped" value={String(enrollment?.totalDropped ?? "-")} />
        <KpiCard label="Conversion Rate" value={enrollment ? `${enrollment.conversionRate.toFixed(1)}%` : "-"} />
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Enrollment trend — new vs dropped (12mo)
        </h3>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        <EnrollmentChart
          data={(enrollment?.enrollmentTrend ?? []).map((t) => ({
            month: t.month.slice(2),
            newStudents: t.newStudents,
            droppedStudents: t.droppedStudents,
          }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Students by Branch</h3>
          <DataTable
            data={enrollment?.studentsByBranch}
            isLoading={isLoading}
            emptyMessage="No active enrollments."
            getRowKey={(r) => r.branchId}
            columns={[
              { header: "Branch", render: (r) => r.branchName },
              { header: "Students", render: (r) => r.count, align: "right" },
            ]}
          />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Students by Course</h3>
          <DataTable
            data={enrollment?.studentsByCourse}
            isLoading={isLoading}
            emptyMessage="No active enrollments."
            getRowKey={(r) => r.courseId}
            columns={[
              { header: "Course", render: (r) => r.courseName },
              { header: "Students", render: (r) => r.count, align: "right" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function TeachersTab({ filters }: { filters: AnalyticsFilters }) {
  const { data: teachers, isLoading } = useTeacherAnalytics(filters);

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Teachers" value={String(teachers?.totalTeachers ?? "-")} />
        <KpiCard label="Active on Dashboard" value={String(teachers?.activeTeachers ?? "-")} />
        <KpiCard label="Avg Students / Teacher" value={teachers ? teachers.averageStudentsPerTeacher.toFixed(1) : "-"} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Teacher Workload</h3>
        <ExportButton
          filename={`teacher-workload-${new Date().toISOString().slice(0, 10)}.csv`}
          rows={teachers?.teacherWorkload}
          columns={[
            { key: "teacherName", label: "Teacher", value: (r) => r.teacherName },
            { key: "groupCount", label: "Groups", value: (r) => r.groupCount },
            { key: "studentCount", label: "Students", value: (r) => r.studentCount },
            { key: "attendanceSessions", label: "Sessions", value: (r) => r.attendanceSessions },
            { key: "lessonNotesCount", label: "Lesson notes", value: (r) => r.lessonNotesCount },
          ]}
        />
      </div>
      <DataTable
        data={teachers?.teacherWorkload}
        isLoading={isLoading}
        emptyMessage="No teachers yet."
        getRowKey={(t) => t.teacherId}
        columns={[
          { header: "Teacher", render: (t) => t.teacherName },
          { header: "Groups", render: (t) => t.groupCount, align: "right" },
          { header: "Students", render: (t) => t.studentCount, align: "right" },
          { header: "Sessions", render: (t) => t.attendanceSessions, align: "right" },
          { header: "Lesson notes", render: (t) => t.lessonNotesCount, align: "right" },
        ]}
      />
    </div>
  );
}

function AttendanceTab({ filters }: { filters: AnalyticsFilters }) {
  const { data: attendance, isLoading } = useAttendanceAnalytics(filters);

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Overall Rate" value={attendance ? `${attendance.overallRate.toFixed(1)}%` : "-"} />
        <KpiCard label="Present" value={String(attendance?.presentCount ?? "-")} />
        <KpiCard label="Absent" value={String(attendance?.absentCount ?? "-")} />
        <KpiCard label="Late / Excused" value={attendance ? `${attendance.lateCount} / ${attendance.excusedCount}` : "-"} />
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Daily attendance rate</h3>
        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        <RateTrendChart
          data={(attendance?.dailyRate ?? []).map((d) => ({ name: d.date.slice(5), value: d.rate }))}
          valueFormatter={(v) => `${v.toFixed(1)}%`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Rate by Group</h3>
          <DataTable
            data={attendance?.rateByGroup}
            isLoading={isLoading}
            emptyMessage="No attendance recorded."
            getRowKey={(r) => r.groupId}
            columns={[
              { header: "Group", render: (r) => r.groupName },
              {
                header: "Rate",
                render: (r) => <span className={r.rate < 70 ? "font-medium text-red-600" : ""}>{r.rate.toFixed(1)}%</span>,
                align: "right",
              },
            ]}
          />
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Low Attendance Students</h3>
            <ExportButton
              filename={`low-attendance-${new Date().toISOString().slice(0, 10)}.csv`}
              rows={attendance?.lowAttendanceStudents}
              columns={[
                { key: "studentName", label: "Student", value: (r) => r.studentName },
                { key: "groupName", label: "Group", value: (r) => r.groupName },
                { key: "rate", label: "Rate %", value: (r) => r.rate.toFixed(1) },
              ]}
            />
          </div>
          <DataTable
            data={attendance?.lowAttendanceStudents}
            isLoading={isLoading}
            emptyMessage="No students below 70% attendance."
            getRowKey={(r) => r.studentId}
            columns={[
              { header: "Student", render: (r) => r.studentName },
              { header: "Group", render: (r) => r.groupName },
              { header: "Rate", render: (r) => <span className="font-medium text-red-600">{r.rate.toFixed(1)}%</span>, align: "right" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const role = useUserRole();
  const canViewRevenue = role !== "reception";
  const visibleTabs = canViewRevenue ? TABS : TABS.filter((t) => t.key !== "revenue");

  const [tab, setTab] = useState<TabKey>("overview");
  const [branchId, setBranchId] = useState("");
  const { data: branches } = useBranches();
  const filters: AnalyticsFilters = { branchId: branchId || undefined };

  const activeTab = visibleTabs.some((t) => t.key === tab) ? tab : "overview";

  // Analytics is Growth+, but /analytics/enrollment is exempted (it also
  // backs the core Dashboard's Active Students card) — probe with
  // attendance instead, which is Analytics-page-only, so this reliably
  // detects the plan lock and swaps the whole page for the locked view.
  const probe = useAttendanceAnalytics(filters);
  const lockInfo = parsePlanLockError(probe.error);
  const { data: currentSub } = useCurrentSubscription(Boolean(lockInfo));

  if (lockInfo) {
    return <LockedFeaturePage featureName="Analytics" requiredPlan={lockInfo.requiredPlan} currentPlan={currentSub?.plan.slug} />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <div className="w-56">
          <SelectField label="" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All branches</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {visibleTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab filters={filters} canViewRevenue={canViewRevenue} />}
      {activeTab === "revenue" && canViewRevenue && <RevenueTab filters={filters} />}
      {activeTab === "enrollment" && <EnrollmentTab filters={filters} />}
      {activeTab === "teachers" && <TeachersTab filters={filters} />}
      {activeTab === "attendance" && <AttendanceTab filters={filters} />}
    </div>
  );
}
