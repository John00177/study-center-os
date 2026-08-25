import { Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "../../hooks/use-translation";

interface LockedFeaturePageProps {
  featureName?: string;
  requiredPlan: string;
  currentPlan?: string;
}

const PLAN_LABELS: Record<string, string> = { starter: "Starter", growth: "Growth", pro: "Pro" };

function label(planSlug: string): string {
  return PLAN_LABELS[planSlug.toLowerCase()] ?? planSlug;
}

export function LockedFeaturePage({ featureName, requiredPlan, currentPlan }: LockedFeaturePageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <Lock className="h-8 w-8 text-amber-500" />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-slate-900 dark:text-slate-100">{t("Premium Feature")}</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {featureName ? `${featureName} is` : "This feature is"} available on the {label(requiredPlan)} plan and higher.
      </p>
      {currentPlan && (
        <span className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">
          Current plan: {label(currentPlan)}
        </span>
      )}
      <button
        onClick={() => navigate("/settings/plan")}
        className="mt-6 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
      >
        {t("Upgrade Now")}
      </button>
      <Link to="/settings/plan" className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700">
        {t("Learn more")}
      </Link>
    </div>
  );
}
