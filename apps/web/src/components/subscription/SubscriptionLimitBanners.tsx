import { LimitWarningBanner } from "./LimitWarningBanner";
import { useSubscriptionLimits } from "../../hooks/use-subscription";
import { useTranslation } from "../../hooks/use-translation";

interface SubscriptionLimitBannersProps {
  /** Show only this resource's banner (e.g. the Students page only cares about students). Omit to show all. */
  resource?: "branch" | "student" | "teacher";
  enabled?: boolean;
}

export function SubscriptionLimitBanners({ resource, enabled = true }: SubscriptionLimitBannersProps) {
  const { t } = useTranslation();
  const { data: limits } = useSubscriptionLimits(enabled);
  if (!limits) return null;

  const entries = [
    { resource: "branch" as const, label: t("branch"), entry: limits.branches },
    { resource: "student" as const, label: t("student"), entry: limits.students },
    { resource: "teacher" as const, label: t("teacher"), entry: limits.teachers },
  ].filter((row) => (resource ? row.resource === resource : true) && row.entry.limit !== null);

  return (
    <>
      {entries.map((row) => (
        <LimitWarningBanner
          key={row.resource}
          resource={row.label}
          current={row.entry.current}
          limit={row.entry.limit as number}
          percentage={row.entry.percentage}
        />
      ))}
    </>
  );
}
