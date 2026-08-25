import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { useParentDashboard } from "../../hooks/use-parent-portal";
import { useParentAuthStore } from "../../stores/parent-auth.store";
import { formatCurrency } from "../../lib/format";
import { useTranslation } from "../../hooks/use-translation";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  submitted: "bg-blue-100 text-blue-700",
  graded: "bg-green-100 text-green-700",
  late: "bg-red-100 text-red-700",
};

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-pink-100 text-pink-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-purple-100 text-purple-700",
];

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function avatarColorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export function ParentDashboardPage() {
  const { t } = useTranslation();
  const parent = useParentAuthStore((state) => state.parent);
  const { data, isLoading } = useParentDashboard();

  const todayDayOfWeek = new Date().getDay();
  const todaysClasses = (data?.groups ?? []).flatMap((group) =>
    group.schedule
      .filter((s) => s.dayOfWeek === todayDayOfWeek)
      .map((s) => ({ ...s, groupName: group.name, courseName: group.courseName, teacherName: group.teacher?.name ?? "Unassigned" })),
  );
  todaysClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const recentHomework = (data?.homework ?? []).slice(0, 3);
  const balance = data?.payments.balance ?? 0;
  const nextCharge = data?.payments.charges.find((c) => c.status === "pending" || c.status === "overdue");
  const teachers = (data?.groups ?? []).filter((g) => g.teacher);

  if (isLoading) {
    return <p className="text-sm text-slate-500">{t("Loading...")}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-indigo-600 p-5 text-white shadow-sm">
        <p className="text-lg font-semibold">Salom, {parent?.parentName ?? "Parent"}!</p>
        <p className="mt-1 text-sm text-indigo-100">Your child: {parent?.studentName}</p>
        <p className="text-xs text-indigo-200">{parent?.organizationName}</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Today's Classes")}</h2>
          <Link to="/parent/schedule" className="text-xs font-medium text-indigo-600">
            {t("View schedule")}
          </Link>
        </div>
        {todaysClasses.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {t("No classes scheduled today.")}
          </p>
        )}
        <div className="space-y-2">
          {todaysClasses.map((c, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-medium text-slate-900">{c.groupName}</p>
              <p className="text-sm text-slate-500">
                {c.startTime} - {c.endTime} · {c.courseName}
              </p>
              <p className="text-xs text-slate-400">{c.teacherName}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Attendance Summary")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-semibold text-green-600">{data?.attendanceSummary.present ?? 0}</p>
            <p className="text-xs text-slate-500">{t("Present")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-semibold text-red-600">{data?.attendanceSummary.absent ?? 0}</p>
            <p className="text-xs text-slate-500">{t("Absent")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-semibold text-yellow-600">{data?.attendanceSummary.late ?? 0}</p>
            <p className="text-xs text-slate-500">{t("Late")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p
              className={`text-2xl text-blue-600 ${
                data?.attendanceSummary.rate !== null && data?.attendanceSummary.rate !== undefined && data.attendanceSummary.rate < 70
                  ? "font-extrabold"
                  : "font-semibold"
              }`}
            >
              {data?.attendanceSummary.rate !== null && data?.attendanceSummary.rate !== undefined
                ? `${data.attendanceSummary.rate}%`
                : "-"}
            </p>
            <p className="text-xs text-slate-500">{t("Rate")}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Recent Homework")}</h2>
          <Link to="/parent/homework" className="text-xs font-medium text-indigo-600">
            {t("View all")}
          </Link>
        </div>
        {recentHomework.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {t("No homework assigned yet.")}
          </p>
        )}
        <div className="space-y-2">
          {recentHomework.map((h) => (
            <div key={h.submissionId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{h.title}</p>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[h.submissionStatus]}`}
                >
                  {h.submissionStatus}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Due {h.dueDate ? new Date(h.dueDate).toLocaleDateString() : "-"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Payment Status")}</h2>
        <Link
          to="/parent/payments"
          className={`block rounded-xl p-5 text-center shadow-sm ${balance > 0 ? "bg-red-50" : "bg-green-50"}`}
        >
          <p className={`text-2xl font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatCurrency(balance, "UZS")}
          </p>
          {balance > 0 ? (
            <p className="mt-1 text-sm font-medium text-red-700">You owe {formatCurrency(balance, "UZS")}</p>
          ) : (
            <p className="mt-1 text-sm font-medium text-green-700">{t("All payments up to date")}</p>
          )}
          {nextCharge && (
            <p className="mt-1 text-xs text-slate-500">Next due: {new Date(nextCharge.dueDate).toLocaleDateString()}</p>
          )}
        </Link>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Quick Contact")}</h2>
          <Link to="/parent/teachers" className="text-xs font-medium text-indigo-600">
            {t("View All Teachers")}
          </Link>
        </div>
        {teachers.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {t("No teachers assigned yet.")}
          </p>
        )}
        <div className="space-y-2">
          {teachers.map((g) => (
            <div key={g.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColorFor(g.teacher!.name)}`}
              >
                {initialsFor(g.teacher!.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{g.teacher!.name}</p>
                <p className="truncate text-xs text-slate-500">{g.name}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {g.teacher!.phone && (
                  <a
                    href={`tel:${g.teacher!.phone}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100"
                    aria-label={`Call ${g.teacher!.name}`}
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                {g.teacher!.email && (
                  <a
                    href={`mailto:${g.teacher!.email}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    aria-label={`Email ${g.teacher!.name}`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
