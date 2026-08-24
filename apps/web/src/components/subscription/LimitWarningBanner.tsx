import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LimitWarningBannerProps {
  resource: string; // e.g. "student", "teacher", "branch"
  current: number;
  limit: number;
  percentage: number;
}

export function LimitWarningBanner({ resource, current, limit, percentage }: LimitWarningBannerProps) {
  const navigate = useNavigate();

  if (percentage < 75) return null;

  const isCritical = percentage >= 90;
  const label = resource === "branch" ? "branches" : `${resource}s`;

  return (
    <div
      className={`mb-6 flex items-center justify-between gap-4 rounded-xl border p-4 ${
        isCritical ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className={`h-5 w-5 shrink-0 ${isCritical ? "text-red-500" : "text-yellow-500"}`} />
        <p className={`text-sm font-medium ${isCritical ? "text-red-800" : "text-yellow-800"}`}>
          You are at {percentage}% of your {label} limit ({current}/{limit}).{" "}
          {isCritical ? "Upgrade now to avoid disruption." : "Consider upgrading."}
        </p>
      </div>
      <button
        onClick={() => navigate("/settings/plan")}
        className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold text-white ${
          isCritical ? "bg-red-600 hover:bg-red-700" : "bg-yellow-600 hover:bg-yellow-700"
        }`}
      >
        Upgrade
      </button>
    </div>
  );
}
