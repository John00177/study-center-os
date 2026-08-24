import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  Building2,
  ClipboardCheck,
  GraduationCap,
  HandCoins,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { BranchDto, GroupDto, TeacherDto } from "@crm/shared-types";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { useCalendar } from "../hooks/use-calendar";
import {
  useEnrollmentAnalytics,
  useFinanceHealth,
  useQuickStats,
  useRevenueAnalytics,
} from "../hooks/use-analytics";
import { useSalaryAnalytics } from "../hooks/use-salary";
import { useCurrentSubscription } from "../hooks/use-subscription";
import { SubscriptionLimitBanners } from "../components/subscription/SubscriptionLimitBanners";
import { TodaysClassesWidget } from "../components/calendar/TodaysClassesWidget";
import { StaffSection } from "../components/dashboard/StaffSection";
import { getMondayIso } from "../lib/week";
import { useUserRole } from "../stores/auth.store";

interface StatCardProps {
  label: string;
  value: string | number | undefined;
  icon: LucideIcon;
  sparklineValues?: number[];
  sparklineColor?: string;
  valueColorClass?: string;
  trend?: { label: string; isUp: boolean } | null;
}

function StatCard({
  label,
  value,
  icon: Icon,
  sparklineValues,
  sparklineColor = "#6366f1",
  valueColorClass = "text-slate-900",
  trend,
}: StatCardProps) {
  const showSparkline = sparklineValues && sparklineValues.length >= 2;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <Icon size={18} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className={`text-3xl font-semibold ${valueColorClass}`}>{value ?? "-"}</p>
        {showSparkline && (
          <div className="h-[60px] w-24">
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={sparklineValues!.map((v) => ({ v }))}>
                <Line type="monotone" dataKey="v" stroke={sparklineColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {trend && (
        <p className={`mt-1 text-xs font-medium ${trend.isUp ? "text-red-500" : "text-green-600"}`}>{trend.label}</p>
      )}
    </div>
  );
}

function QuickStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">{icon}</div>
      <div>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const role = useUserRole();
  const canSeeFinance = role === "owner" || role === "admin";
  const { data: subscription } = useCurrentSubscription(canSeeFinance);
  // Revenue/Outstanding cards come from AnalyticsController, which is
  // Growth+ — on Starter, skip the fetch entirely rather than 403ing and
  // just hide those two cards (Finance Overview and Quick Stats stay, since
  // those endpoints are explicitly exempted from the plan gate).
  const canSeeRevenue = canSeeFinance && (subscription?.allowedModules.includes("analytics") ?? false);
  const todayIso = new Date().toISOString().slice(0, 10);

  const branches = useQuery({
    queryKey: ["branches"],
    queryFn: async () => (await api.get<BranchDto[]>("/branches")).data,
  });
  const teachers = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => (await api.get<TeacherDto[]>("/teachers")).data,
  });
  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await api.get<GroupDto[]>("/groups")).data,
  });
  const enrollment = useEnrollmentAnalytics();
  const revenue = useRevenueAnalytics({}, canSeeRevenue);
  const financeHealth = useFinanceHealth(canSeeFinance);
  const salaryAnalytics = useSalaryAnalytics(canSeeFinance);
  const quickStats = useQuickStats();
  const calendar = useCalendar(getMondayIso(new Date()), {});

  const last7DaysRevenue = (revenue.data?.dailyRevenue ?? []).slice(-7).map((d) => d.amount);
  const monthly = revenue.data?.monthlyRevenue ?? [];
  const thisMonthRevenue = monthly[monthly.length - 1]?.amount ?? 0;

  const salaryHistory = salaryAnalytics.data?.monthlyHistory ?? [];
  const lastMonthSalaryTotal = salaryHistory.length >= 2
    ? salaryHistory[salaryHistory.length - 2].totalPaid + salaryHistory[salaryHistory.length - 2].totalPending
    : null;
  const thisMonthSalaryExpense = salaryAnalytics.data?.totalSalaryExpense ?? 0;
  const salaryTrend =
    lastMonthSalaryTotal != null && lastMonthSalaryTotal > 0
      ? {
          isUp: thisMonthSalaryExpense > lastMonthSalaryTotal,
          label: `${thisMonthSalaryExpense >= lastMonthSalaryTotal ? "+" : ""}${(
            ((thisMonthSalaryExpense - lastMonthSalaryTotal) / lastMonthSalaryTotal) *
            100
          ).toFixed(0)}% vs last month`,
        }
      : null;

  const todaysSessions = calendar.data?.days.find((d) => d.date === todayIso)?.sessions;
  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Dashboard</h1>

      <SubscriptionLimitBanners enabled={canSeeFinance} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Branches" value={branches.data?.length} icon={Building2} />
        <StatCard label="Teachers" value={teachers.data?.length} icon={GraduationCap} />
        <StatCard label="Active Students" value={enrollment.data?.totalStudents} icon={Users} />
        <StatCard label="Groups" value={groups.data?.length} icon={UsersRound} />
        {canSeeRevenue && (
          <StatCard
            label="Revenue (this month)"
            value={formatCurrency(thisMonthRevenue, "UZS")}
            icon={Banknote}
            sparklineValues={last7DaysRevenue}
          />
        )}
        {canSeeRevenue && (
          <StatCard
            label="Outstanding Payments"
            value={revenue.data ? formatCurrency(revenue.data.outstandingBalance, "UZS") : undefined}
            icon={Wallet}
          />
        )}
        {canSeeFinance && (
          <StatCard
            label="Monthly Salary Expense"
            value={salaryAnalytics.data ? formatCurrency(thisMonthSalaryExpense, "UZS") : undefined}
            icon={HandCoins}
            valueColorClass="text-red-600"
            sparklineValues={salaryHistory.map((h) => h.totalPaid + h.totalPending)}
            sparklineColor="#ef4444"
            trend={salaryTrend}
          />
        )}
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick Stats</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickStat label="Newcomers this week" value={String(quickStats.data?.newcomersThisWeek ?? "-")} icon={<UserPlus size={18} />} />
          <QuickStat label="Conversions this week" value={String(quickStats.data?.conversionsThisWeek ?? "-")} icon={<UserCheck size={18} />} />
          <QuickStat
            label="Homework completion rate"
            value={quickStats.data ? `${quickStats.data.homeworkCompletionRate.toFixed(0)}%` : "-"}
            icon={<TrendingUp size={18} />}
          />
          <QuickStat
            label="Today's attendance rate"
            value={quickStats.data ? `${quickStats.data.todayAttendanceRate.toFixed(0)}%` : "-"}
            icon={<ClipboardCheck size={18} />}
          />
        </div>
      </div>

      {canSeeFinance && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Finance Overview</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Cash on hand</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {financeHealth.data ? formatCurrency(financeHealth.data.totalCashOnHand, "UZS") : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">This month revenue</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {financeHealth.data ? formatCurrency(financeHealth.data.thisMonthRevenue, "UZS") : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Overdue amount</p>
              <p className="mt-1 text-xl font-semibold text-red-600">
                {financeHealth.data ? formatCurrency(financeHealth.data.overdueChargesAmount, "UZS") : "-"}
              </p>
              <p className="text-xs text-slate-400">{financeHealth.data?.overdueChargesCount ?? 0} charges overdue</p>
            </div>
          </div>
        </div>
      )}

      {/* Staff management (list, suspend/activate) is owner-only — admins see
          the rest of this dashboard but not staff administration. */}
      {role === "owner" && <StaffSection />}

      <TodaysClassesWidget
        dateLabel={todayLabel}
        sessions={todaysSessions}
        isLoading={calendar.isLoading}
        showBranch
        onSessionClick={() => navigate("/calendar")}
      />
    </div>
  );
}
