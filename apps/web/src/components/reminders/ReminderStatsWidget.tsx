import { useReminderStats } from "../../hooks/use-reminders";
import { useTranslation } from "../../hooks/use-translation";

export function ReminderStatsWidget() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useReminderStats();

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {t("Payment reminders (this month)")}
      </h2>
      {isLoading && <p className="text-sm text-slate-500">{t("Loading...")}</p>}
      {!isLoading && stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t("Sent")}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.sent}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t("Delivery rate")}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {stats.sent === 0 ? "—" : `${Math.round((stats.delivered / stats.sent) * 100)}%`}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t("Collection rate")}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {Math.round(stats.conversionRate * 100)}%
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t("Avg days to pay")}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {stats.avgDaysToPay === null ? "—" : stats.avgDaysToPay.toFixed(1)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
