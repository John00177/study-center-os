import { useState } from "react";
import { CheckSquare, Square } from "lucide-react";
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
import { useBulkUpdateTickets, useTicketList, useTicketSummary, type TicketFilters } from "../../hooks/use-support-tickets";
import { useOrganizations } from "../../hooks/use-platform-admin";
import { useToast } from "../../components/Toast";

const BASE_PATH = "admin/support-tickets";

export function SupportTicketsPage() {
  const [filters, setFilters] = useState<TicketFilters>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: tickets, isLoading } = useTicketList(BASE_PATH, filters);
  const { data: summary } = useTicketSummary(BASE_PATH);
  const { data: organizations } = useOrganizations();
  const bulkUpdate = useBulkUpdateTickets(BASE_PATH);
  const { showToast } = useToast();

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkSetStatus(status: TicketStatus) {
    if (selected.size === 0) return;
    try {
      await bulkUpdate.mutateAsync({ ids: Array.from(selected), status });
      showToast(`${selected.size} ticket(s) marked ${STATUS_LABELS[status].toLowerCase()}.`);
      setSelected(new Set());
    } catch {
      showToast("Failed to update tickets.", "error");
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">Support Tickets</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total Open</p>
          <p className={`text-2xl font-semibold ${(summary?.totalOpen ?? 0) > 10 ? "text-red-400" : "text-white"}`}>
            {summary?.totalOpen ?? "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Today</p>
          <p className="text-2xl font-semibold text-white">{summary?.totalToday ?? "-"}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">This Week</p>
          <p className="text-2xl font-semibold text-white">{summary?.totalThisWeek ?? "-"}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Avg Response Time</p>
          <p className="text-2xl font-semibold text-white">~4h</p>
        </div>
      </div>

      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="w-44">
          <SelectField
            label="Status"
            value={filters.status ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          >
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-44">
          <SelectField
            label="Type"
            value={filters.type ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || undefined }))}
          >
            <option value="">All types</option>
            {(Object.keys(TYPE_LABELS) as TicketType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-44">
          <SelectField
            label="Priority"
            value={filters.priority ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value || undefined }))}
          >
            <option value="">All priorities</option>
            {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-52">
          <SelectField
            label="Organization"
            value={filters.organizationId ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, organizationId: e.target.value || undefined }))}
          >
            <option value="">All organizations</option>
            {(organizations ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-56 flex-1">
          <TextField
            label="Search"
            placeholder="Search title or description..."
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-indigo-800 bg-indigo-950/50 px-4 py-2 text-sm text-indigo-200">
          <span>{selected.size} selected</span>
          <button
            onClick={() => bulkSetStatus("in_progress")}
            className="rounded-md border border-indigo-700 px-2.5 py-1 text-xs hover:bg-indigo-900"
          >
            Mark In Progress
          </button>
          <button
            onClick={() => bulkSetStatus("resolved")}
            className="rounded-md border border-indigo-700 px-2.5 py-1 text-xs hover:bg-indigo-900"
          >
            Mark Resolved
          </button>
          <button
            onClick={() => bulkSetStatus("closed")}
            className="rounded-md border border-indigo-700 px-2.5 py-1 text-xs hover:bg-indigo-900"
          >
            Close
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-indigo-300 hover:underline">
            Clear
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <DataTable
          data={tickets}
          isLoading={isLoading}
          emptyMessage="No support tickets found."
          getRowKey={(t) => t.id}
          onRowClick={(t) => setViewingId(t.id)}
          columns={[
            {
              header: "",
              render: (t) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelected(t.id);
                  }}
                  aria-label="Select ticket"
                >
                  {selected.has(t.id) ? (
                    <CheckSquare className="h-4 w-4 text-indigo-400" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500" />
                  )}
                </button>
              ),
            },
            { header: "Organization", render: (t) => <span className="text-white">{t.organizationName ?? "Platform"}</span> },
            {
              header: "Submitter",
              render: (t) => (
                <div>
                  <p className="text-white">{t.submitterName}</p>
                  <p className="text-xs capitalize text-slate-500">{t.submitterType.replace("_", " ")}</p>
                </div>
              ),
            },
            { header: "Type", render: (t) => `${TYPE_ICONS[t.type]} ${TYPE_LABELS[t.type]}` },
            { header: "Title", render: (t) => <span className="line-clamp-1 max-w-xs text-white">{t.title}</span> },
            {
              header: "Priority",
              render: (t) => (
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT_CLASSES[t.priority]}`} />
                  {PRIORITY_LABELS[t.priority]}
                </span>
              ),
            },
            {
              header: "Status",
              render: (t) => (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[t.status]}`}>
                  {STATUS_LABELS[t.status]}
                </span>
              ),
            },
            { header: "Created", render: (t) => formatRelativeTime(t.createdAt) },
          ]}
        />
      </div>

      <TicketDetailModal
        open={Boolean(viewingId)}
        onClose={() => setViewingId(null)}
        basePath={BASE_PATH}
        ticketId={viewingId}
        showInternalNotes
        showOrganization
        canReply
      />
    </div>
  );
}
