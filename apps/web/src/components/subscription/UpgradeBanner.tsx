import { useState } from "react";
import { Lock, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeBannerProps {
  feature: string;
  currentPlan: string;
  requiredPlan: string;
  /** dismissKey scopes "maybe later" to this specific banner for the browser session. */
  dismissKey: string;
}

const PLAN_LABELS: Record<string, string> = { starter: "Starter", growth: "Growth", pro: "Pro" };

function label(planSlug: string): string {
  return PLAN_LABELS[planSlug.toLowerCase()] ?? planSlug;
}

export function UpgradeBanner({ feature, currentPlan, requiredPlan, dismissKey }: UpgradeBannerProps) {
  const navigate = useNavigate();
  const storageKey = `upgradeBannerDismissed_${dismissKey}`;
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(storageKey) === "true");

  if (dismissed) return null;

  return (
    <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            {feature} requires the {label(requiredPlan)} plan. You are on the {label(currentPlan)} plan.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => navigate("/settings/plan")}
          className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
        >
          Upgrade Now
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem(storageKey, "true");
            setDismissed(true);
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
        >
          <X className="h-3.5 w-3.5" />
          Maybe later
        </button>
      </div>
    </div>
  );
}
