import { useState } from "react";
import type { PlanModule, SubscriptionPlanListItemDto } from "@crm/shared-types";
import { Check, Lock } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useChangePlan, useCurrentSubscription, useSubscriptionPlans } from "../hooks/use-subscription";
import { useTranslation } from "../hooks/use-translation";

const PLAN_LABELS: Record<string, string> = { starter: "Starter", growth: "Growth", pro: "Pro" };

// Mirrors apps/api/src/modules/subscription/subscription-limits.service.ts —
// duplicated here for display copy only (the comparison table and the
// "you'll lose X, Y, Z" downgrade warning); enforcement always happens on
// the backend, this is never relied on for access control.
const PLAN_FEATURES: Record<string, { modules: PlanModule[]; maxBranches: number | null; maxStudents: number | null; maxTeachers: number | null }> = {
  starter: { modules: [], maxBranches: 1, maxStudents: 80, maxTeachers: 3 },
  growth: {
    modules: ["payment_reminders", "homework", "analytics", "ai_tests"],
    maxBranches: 3,
    maxStudents: 500,
    maxTeachers: 20,
  },
  pro: {
    modules: ["payment_reminders", "homework", "analytics", "ai_tests", "parent_portal", "multi_branch_reports"],
    maxBranches: null,
    maxStudents: null,
    maxTeachers: null,
  },
};

const ALL_MODULES: { key: PlanModule; label: string }[] = [
  { key: "payment_reminders", label: "Payment reminders (SMS/WhatsApp)" },
  { key: "homework", label: "Homework module" },
  { key: "analytics", label: "Analytics & reporting" },
  { key: "ai_tests", label: "AI Test Generator" },
  { key: "parent_portal", label: "Parent Portal" },
  { key: "multi_branch_reports", label: "Multi-branch reports" },
];

function planLabel(slug: string): string {
  return PLAN_LABELS[slug] ?? slug;
}

function formatLimit(value: number | null): string {
  return value === null ? "Unlimited" : String(value);
}

function meterColor(percentage: number): string {
  if (percentage >= 100) return "bg-red-500";
  if (percentage >= 75) return "bg-yellow-500";
  return "bg-green-500";
}

function UsageMeter({ label, current, limit, percentage }: { label: string; current: number; limit: number | null; percentage: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={`font-medium ${percentage >= 100 ? "text-red-600" : percentage >= 75 ? "text-yellow-600" : "text-slate-500"}`}>
          {current}/{formatLimit(limit)}
          {limit !== null && ` (${percentage}%)`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${limit === null ? "bg-slate-300" : meterColor(percentage)}`}
          style={{ width: limit === null ? "12%" : `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

export function PlanAndBillingPage() {
  const { t } = useTranslation();
  const { data: current, isLoading: currentLoading } = useCurrentSubscription();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const changePlan = useChangePlan();
  const { showToast } = useToast();

  const [annual, setAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanListItemDto | null>(null);

  const sortedPlans = [...(plans ?? [])].sort((a, b) => a.price - b.price);
  const currentPlanPrice = sortedPlans.find((p) => p.slug === current?.plan.slug)?.price ?? 0;
  const isDowngrade = selectedPlan ? selectedPlan.price < currentPlanPrice : false;

  const lostModules =
    selectedPlan && current
      ? (PLAN_FEATURES[current.plan.slug]?.modules ?? []).filter(
          (m) => !(PLAN_FEATURES[selectedPlan.slug]?.modules ?? []).includes(m),
        )
      : [];

  async function confirmChangePlan() {
    if (!selectedPlan) return;
    try {
      await changePlan.mutateAsync(selectedPlan.id);
      showToast(`${isDowngrade ? "Switched to" : "Upgraded to"} ${planLabel(selectedPlan.slug)}! ${isDowngrade ? "" : "New features unlocked."}`);
      setSelectedPlan(null);
    } catch {
      showToast(t("Failed to change plan."), "error");
    }
  }

  if (currentLoading || plansLoading) {
    return <p className="text-sm text-slate-500">{t("Loading...")}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("Plan & Billing")}</h1>

      {current && (
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Current Plan")}</h2>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-700">
                {current.subscription?.status ?? "no subscription"}
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{planLabel(current.plan.slug)}</p>
            <p className="mt-1 text-sm text-slate-500">
              {sortedPlans.find((p) => p.slug === current.plan.slug)
                ? `${sortedPlans.find((p) => p.slug === current.plan.slug)!.price} ${sortedPlans.find((p) => p.slug === current.plan.slug)!.currency}/month`
                : "—"}
            </p>
            {current.subscription && (
              <p className="mt-3 text-xs text-slate-400">
                Renews {new Date(current.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Usage")}</h2>
            <div className="space-y-4">
              <UsageMeter label={t("Branches")} current={current.usage.branchCount} limit={current.limits.maxBranches} percentage={current.limits.maxBranches ? Math.round((current.usage.branchCount / current.limits.maxBranches) * 100) : 0} />
              <UsageMeter label={t("Students")} current={current.usage.studentCount} limit={current.limits.maxStudents} percentage={current.limits.maxStudents ? Math.round((current.usage.studentCount / current.limits.maxStudents) * 100) : 0} />
              <UsageMeter label={t("Teachers")} current={current.usage.teacherCount} limit={current.limits.maxTeachers} percentage={current.limits.maxTeachers ? Math.round((current.usage.teacherCount / current.limits.maxTeachers) * 100) : 0} />
            </div>
          </div>
        </div>
      )}

      {current && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Features")}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ALL_MODULES.map((m) => {
              const unlocked = current.allowedModules.includes(m.key);
              return (
                <li key={m.key} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${unlocked ? "border-slate-200" : "border-slate-100 bg-slate-50"}`}>
                  <span className={`flex items-center gap-2 text-sm ${unlocked ? "text-slate-800" : "text-slate-400"}`}>
                    {unlocked ? <Check className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-slate-300" />}
                    {t(m.label)}
                  </span>
                  {!unlocked && (
                    <a href="#plan-comparison" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                      {t("Upgrade to unlock")}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div id="plan-comparison" className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Compare Plans")}</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={annual} onChange={(e) => setAnnual(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
          {t("Pay annually, save 2 months")}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sortedPlans.map((plan) => {
          const isCurrent = plan.slug === current?.plan.slug;
          const features = PLAN_FEATURES[plan.slug];
          const displayPrice = annual ? plan.price * 10 : plan.price;

          return (
            <div
              key={plan.id}
              className={`rounded-xl border bg-white p-6 shadow-sm ${isCurrent ? "border-primary ring-2 ring-primary/20" : "border-slate-200"}`}
            >
              {isCurrent && (
                <span className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {t("Current plan")}
                </span>
              )}
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{planLabel(plan.slug)}</h3>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {displayPrice} {plan.currency}
                <span className="text-sm font-normal text-slate-500">/{annual ? "year" : "month"}</span>
              </p>

              <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                <li>{formatLimit(features?.maxBranches ?? null)} branches</li>
                <li>{formatLimit(features?.maxStudents ?? null)} students</li>
                <li>{formatLimit(features?.maxTeachers ?? null)} teachers</li>
                {ALL_MODULES.filter((m) => features?.modules.includes(m.key)).map((m) => (
                  <li key={m.key} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    {t(m.label)}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPlan(plan)}
                disabled={isCurrent}
                className="mt-6 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isCurrent ? t("Current Plan") : t("Select")}
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(selectedPlan)}
        title={isDowngrade ? "Downgrade plan" : "Upgrade plan"}
        message={
          selectedPlan
            ? isDowngrade
              ? `You will lose access to: ${lostModules.map((m) => ALL_MODULES.find((x) => x.key === m)?.label ?? m).join(", ") || "no features"}. Continue switching to ${planLabel(selectedPlan.slug)}?`
              : `You will be charged ${selectedPlan.price} ${selectedPlan.currency} monthly. Continue upgrading to ${planLabel(selectedPlan.slug)}?`
            : ""
        }
        confirmLabel={changePlan.isPending ? "Processing..." : isDowngrade ? "Downgrade" : "Upgrade"}
        isConfirming={changePlan.isPending}
        onConfirm={confirmChangePlan}
        onCancel={() => setSelectedPlan(null)}
      />
    </div>
  );
}
