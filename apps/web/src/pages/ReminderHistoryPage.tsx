import type { ReminderStatus, ReminderType } from "@crm/shared-types";
import { useState } from "react";
import { DataTable } from "../components/DataTable";
import { SelectField } from "../components/form/Field";
import { useReminderHistory } from "../hooks/use-reminders";
import { useCurrentSubscription } from "../hooks/use-subscription";
import { LockedFeaturePage } from "../components/subscription/LockedFeaturePage";
import { parsePlanLockError } from "../lib/plan-lock";
import { formatCurrency } from "../lib/format";
import { useTranslation } from "../hooks/use-translation";

const STATUS_STYLES: Record<ReminderStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export function ReminderHistoryPage() {
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState<ReminderType | "">("");
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | "">("");
  const { data, isLoading, error } = useReminderHistory();
  const lockInfo = parsePlanLockError(error);
  const { data: currentSub } = useCurrentSubscription(Boolean(lockInfo));

  const filtered = (data ?? []).filter(
    (r) => (!typeFilter || r.type === typeFilter) && (!statusFilter || r.status === statusFilter),
  );

  if (lockInfo) {
    return <LockedFeaturePage featureName="Payment Reminders" requiredPlan={lockInfo.requiredPlan} currentPlan={currentSub?.plan.slug} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("Reminder History")}</h1>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="w-48">
          <SelectField
            label={t("Type")}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ReminderType | "")}
          >
            <option value="">{t("All types")}</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">{t("WhatsApp")}</option>
            <option value="email">{t("Email")}</option>
            <option value="push">{t("Push")}</option>
          </SelectField>
        </div>
        <div className="w-48">
          <SelectField
            label={t("Status")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReminderStatus | "")}
          >
            <option value="">{t("All statuses")}</option>
            <option value="pending">{t("Pending")}</option>
            <option value="sent">{t("Sent")}</option>
            <option value="delivered">{t("Delivered")}</option>
            <option value="failed">{t("Failed")}</option>
          </SelectField>
        </div>
      </div>

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage={t("No reminders sent yet.")}
        getRowKey={(r) => r.id}
        columns={[
          { header: t("Student"), render: (r) => r.student?.name ?? "-" },
          { header: t("Amount"), render: (r) => (r.charge ? formatCurrency(r.charge.amount, r.charge.currency) : "-") },
          { header: t("Type"), render: (r) => <span className="uppercase">{r.type}</span> },
          {
            header: t("Status"),
            render: (r) => (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[r.status]}`}
              >
                {r.status}
              </span>
            ),
          },
          { header: t("Sent at"), render: (r) => new Date(r.createdAt).toLocaleString() },
        ]}
      />
    </div>
  );
}
