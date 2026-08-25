import { Banknote, CalendarClock, ClipboardCheck, UserPlus, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TodaysClassesWidget } from "../components/calendar/TodaysClassesWidget";
import { useCalendar } from "../hooks/use-calendar";
import { useOverdueCharges } from "../hooks/use-reminders";
import { useStudents } from "../hooks/use-students";
import { formatCurrency } from "../lib/format";
import { getMondayIso } from "../lib/week";

interface StatCardProps {
  label: string;
  value: string | number | undefined;
  icon: LucideIcon;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <Icon size={18} />
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value ?? "-"}</p>
    </div>
  );
}

export function ReceptionDashboardPage() {
  const navigate = useNavigate();
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: overdueCharges, isLoading: overdueLoading } = useOverdueCharges();
  const calendar = useCalendar(getMondayIso(new Date()), {});

  const newcomers = (students ?? []).filter((s) => s.status === "newcomer");
  const activeStudents = (students ?? []).filter((s) => s.status === "active");
  const recentNewcomers = [...newcomers]
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
    .slice(0, 5);

  const overdueAmount = (overdueCharges ?? []).reduce((sum, c) => sum + c.amount, 0);
  const todaysSessions = calendar.data?.days.find((d) => d.date === todayIso)?.sessions;
  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Reception Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Newcomers" value={studentsLoading ? undefined : newcomers.length} icon={UserPlus} />
        <StatCard label="Active Students" value={studentsLoading ? undefined : activeStudents.length} icon={ClipboardCheck} />
        <StatCard label="Today's Classes" value={todaysSessions?.length} icon={CalendarClock} />
        <StatCard
          label="Overdue Payments"
          value={overdueLoading ? undefined : `${overdueCharges?.length ?? 0} (${formatCurrency(overdueAmount, "UZS")})`}
          icon={Banknote}
        />
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <button
          onClick={() => navigate("/reception/newcomers")}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4" />
          Register Newcomer
        </button>
        <button
          onClick={() => navigate("/reception/attendance")}
          className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ClipboardCheck className="h-4 w-4" />
          Take Attendance
        </button>
        <button
          onClick={() => navigate("/reception/finance/overdue")}
          className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Banknote className="h-4 w-4" />
          View Overdue
        </button>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent Newcomers</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {recentNewcomers.length === 0 && (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">No newcomers registered yet.</p>
          )}
          {recentNewcomers.length > 0 && (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentNewcomers.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{s.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.phone ?? "No phone on file"}</p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(s.registeredAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TodaysClassesWidget
        dateLabel={todayLabel}
        sessions={todaysSessions}
        isLoading={calendar.isLoading}
        showBranch
        onSessionClick={() => navigate("/reception/schedule")}
      />
    </div>
  );
}
