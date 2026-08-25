import { Link } from "react-router-dom";
import { useStudentDashboard } from "../../hooks/use-student-portal";
import { useStudentAuthStore } from "../../stores/student-auth.store";
import { formatCurrency } from "../../lib/format";
import { useTranslation } from "../../hooks/use-translation";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  graded: "bg-green-100 text-green-700",
  late: "bg-red-100 text-red-700",
};

export function StudentDashboardPage() {
  const { t } = useTranslation();
  const student = useStudentAuthStore((state) => state.student);
  const { data, isLoading } = useStudentDashboard();

  const todayDayOfWeek = new Date().getDay();
  const todaysClasses = (data?.groups ?? []).flatMap((group) =>
    group.schedule
      .filter((s) => s.dayOfWeek === todayDayOfWeek)
      .map((s) => ({ ...s, groupName: group.name, teacherName: group.teacherName })),
  );
  todaysClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const pendingHomework = (data?.homework ?? [])
    .filter((h) => h.submissionStatus === "pending" || h.submissionStatus === "late")
    .slice(0, 3);

  const balance = data?.payments.balance ?? 0;

  if (isLoading) {
    return <p className="text-sm text-slate-500">{t("Loading...")}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-indigo-600 p-5 text-white shadow-sm">
        <p className="text-lg font-semibold">Salom, {student?.name.split(" ")[0]}!</p>
        <p className="mt-1 text-sm text-indigo-100">{t("Welcome back to your student portal.")}</p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Today's Classes")}</h2>
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
                {c.startTime} - {c.endTime} · {c.teacherName}
              </p>
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
            <p className="text-2xl font-semibold text-indigo-600">
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
          <Link to="/student/homework" className="text-xs font-medium text-indigo-600">
            {t("View all")}
          </Link>
        </div>
        {pendingHomework.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {t("No pending homework — you're all caught up!")}
          </p>
        )}
        <div className="space-y-2">
          {pendingHomework.map((h) => (
            <div key={h.submissionId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{h.title}</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[h.submissionStatus]}`}>
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
        <div className={`rounded-xl p-4 text-center shadow-sm ${balance > 0 ? "bg-red-50" : "bg-green-50"}`}>
          {balance > 0 ? (
            <p className="font-medium text-red-700">You owe {formatCurrency(balance, "UZS")}</p>
          ) : (
            <p className="font-medium text-green-700">{t("All payments up to date")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
