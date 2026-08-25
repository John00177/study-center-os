import { useState } from "react";
import type { TicketPriority, TicketStatus, TicketType } from "@crm/shared-types";
import { DataTable } from "../../components/DataTable";
import { SelectField, TextField } from "../../components/form/Field";
import { TicketDetailModal } from "../../components/support-tickets/TicketDetailModal";
import {
  PRIORITY_DOT_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  TYPE_ICONS,
  TYPE_LABELS,
  formatRelativeTime,
} from "../../components/support-tickets/ticket-format";
import { useTicketList, useTicketSummary, type TicketFilters } from "../../hooks/use-support-tickets";
import { useTranslation } from "../../hooks/use-translation";

const BASE_PATH = "support-tickets";

export function OrgSupportTicketsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<TicketFilters>({});
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: tickets, isLoading } = useTicketList(BASE_PATH, filters);
  const { data: summary } = useTicketSummary(BASE_PATH);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("Support Tickets")}</h1>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("Total Open")}</p>
          <p className={`text-2xl font-semibold ${(summary?.totalOpen ?? 0) > 10 ? "text-red-600" : "text-slate-900"}`}>
            {summary?.totalOpen ?? "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("Today")}</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{summary?.totalToday ?? "-"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("This Week")}</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{summary?.totalThisWeek ?? "-"}</p>
        </div>
      </div>

      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="w-44">
          <SelectField
            label={t("Status")}
            value={filters.status ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          >
            <option value="">{t("All statuses")}</option>
            {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-44">
          <SelectField
            label={t("Type")}
            value={filters.type ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || undefined }))}
          >
            <option value="">{t("All types")}</option>
            {(Object.keys(TYPE_LABELS) as TicketType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-44">
          <SelectField
            label={t("Priority")}
            value={filters.priority ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value || undefined }))}
          >
            <option value="">{t("All priorities")}</option>
            {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-56 flex-1">
          <TextField
            label={t("Search")}
            placeholder={t("Search title or description...")}
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
          />
        </div>
      </div>

      <DataTable
        data={tickets}
        isLoading={isLoading}
        emptyMessage={t("No support tickets yet.")}
        getRowKey={(t) => t.id}
        onRowClick={(t) => setViewingId(t.id)}
        columns={[
          {
            header: t("Submitter"),
            render: (t) => (
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{t.submitterName}</p>
                <p className="text-xs capitalize text-slate-500">{t.submitterType.replace("_", " ")}</p>
              </div>
            ),
          },
          { header: t("Type"), render: (t) => `${TYPE_ICONS[t.type]} ${TYPE_LABELS[t.type]}` },
          { header: t("Title"), render: (t) => <span className="line-clamp-1 max-w-xs">{t.title}</span> },
          {
            header: t("Priority"),
            render: (t) => (
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT_CLASSES[t.priority]}`} />
                {PRIORITY_LABELS[t.priority]}
              </span>
            ),
          },
          {
            header: t("Status"),
            render: (t) => (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[t.status]}`}>
                {STATUS_LABELS[t.status]}
              </span>
            ),
          },
          { header: t("Created"), render: (t) => formatRelativeTime(t.createdAt) },
        ]}
      />

      <TicketDetailModal open={Boolean(viewingId)} onClose={() => setViewingId(null)} basePath={BASE_PATH} ticketId={viewingId} />
    </div>
  );
}
