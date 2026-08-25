import { PlatformRevenueChart } from "../../components/charts/PlatformRevenueChart";
import { usePlatformRevenue } from "../../hooks/use-platform-admin";
import { useTranslation } from "../../hooks/use-translation";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function PlatformRevenuePage() {
  const { t } = useTranslation();
  const { data, isLoading } = usePlatformRevenue();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">{t("Revenue")}</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">MRR</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{data ? formatUsd(data.totalMrr) : "-"}</p>
        </div>
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">ARR</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{data ? formatUsd(data.totalArr) : "-"}</p>
        </div>
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">{t("Total Revenue")}</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{data ? formatUsd(data.totalRevenue) : "-"}</p>
        </div>
        <div className="h-24 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-medium text-slate-400">{t("Churn Rate")}</p>
          <p className="mt-1.5 text-xl font-semibold text-white">{data ? `${data.churnRate.toFixed(1)}%` : "-"}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Monthly Revenue (12mo)")}</h3>
          {isLoading && <p className="text-xs text-slate-500">{t("Loading...")}</p>}
          <PlatformRevenueChart
            data={(data?.monthlyRevenue ?? []).map((m) => ({ name: m.month.slice(2), value: m.amount }))}
            valueFormatter={formatUsd}
          />
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Revenue by Plan")}</h3>
          <PlatformRevenueChart
            data={(data?.revenueByPlan ?? []).map((p) => ({ name: p.planName, value: p.amount }))}
            valueFormatter={formatUsd}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-center">
          <p className="text-2xl font-semibold text-white">{data?.activeOrganizations ?? "-"}</p>
          <p className="text-xs text-slate-400">{t("Active organizations")}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-center">
          <p className="text-2xl font-semibold text-white">{data?.trialOrganizations ?? "-"}</p>
          <p className="text-xs text-slate-400">{t("Trial organizations")}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-center">
          <p className="text-2xl font-semibold text-white">{data?.suspendedOrganizations ?? "-"}</p>
          <p className="text-xs text-slate-400">{t("Suspended organizations")}</p>
        </div>
      </div>
    </div>
  );
}
