import { useState } from "react";
import { Eye } from "lucide-react";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { SelectField, TextField } from "../../components/form/Field";
import { BrandedSpinner } from "../../components/branding/BrandedSpinner";
import { useAuditLog, useAuditLogEntityTypes, useAuditLogEntry, type AuditLogFilters } from "../../hooks/use-audit-log";
import { useStaffList } from "../../hooks/use-staff";

const VERB_LABELS: Record<string, string> = {
  created: "Create",
  updated: "Update",
  deleted: "Delete",
};

const VERB_BADGE_CLASSES: Record<string, string> = {
  created: "bg-green-100 text-green-700",
  updated: "bg-blue-100 text-blue-700",
  deleted: "bg-red-100 text-red-700",
};

function verbFromAction(action: string): string {
  return action.split(".").pop() ?? action;
}

function formatEntityType(entityType: string): string {
  return entityType.charAt(0).toUpperCase() + entityType.slice(1).replace(/_/g, " ");
}

function AuditLogDetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: entry, isLoading } = useAuditLogEntry(id);

  return (
    <Modal open={Boolean(id)} onClose={onClose} title="Audit Log Entry" widthClassName="max-w-2xl">
      {isLoading && (
        <div className="flex justify-center py-8">
          <BrandedSpinner />
        </div>
      )}
      {entry && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Actor</p>
              <p className="text-slate-900 dark:text-slate-100">{entry.actorName ?? "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">When</p>
              <p className="text-slate-900 dark:text-slate-100">{new Date(entry.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Action</p>
              <p className="text-slate-900 dark:text-slate-100">{entry.action}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Entity</p>
              <p className="text-slate-900 dark:text-slate-100">
                {formatEntityType(entry.entityType)} <span className="text-slate-400">#{entry.entityId.slice(0, 8)}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Before</p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                {entry.beforeValue ? JSON.stringify(entry.beforeValue, null, 2) : "—"}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">After</p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                {entry.afterValue ? JSON.stringify(entry.afterValue, null, 2) : "—"}
              </pre>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({ limit: 25, offset: 0 });
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data, isLoading } = useAuditLog(filters);
  const { data: entityTypes } = useAuditLogEntityTypes();
  const { data: staff } = useStaffList();

  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  const total = data?.total ?? 0;
  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  function updateFilter(next: Partial<AuditLogFilters>) {
    setFilters((f) => ({ ...f, ...next, offset: 0 }));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Audit Log</h1>
        <p className="text-sm text-slate-600">A record of who changed what, and when.</p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <SelectField
          label="Action"
          value={filters.verb ?? ""}
          onChange={(e) => updateFilter({ verb: e.target.value as AuditLogFilters["verb"] })}
        >
          <option value="">All actions</option>
          <option value="created">Create</option>
          <option value="updated">Update</option>
          <option value="deleted">Delete</option>
        </SelectField>

        <SelectField
          label="Entity Type"
          value={filters.entityType ?? ""}
          onChange={(e) => updateFilter({ entityType: e.target.value || undefined })}
        >
          <option value="">All entities</option>
          {entityTypes?.map((t) => (
            <option key={t} value={t}>
              {formatEntityType(t)}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="User"
          value={filters.actorId ?? ""}
          onChange={(e) => updateFilter({ actorId: e.target.value || undefined })}
        >
          <option value="">All users</option>
          {staff?.map((s) => (
            <option key={s.userId} value={s.userId}>
              {s.name}
            </option>
          ))}
        </SelectField>

        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="From"
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => updateFilter({ from: e.target.value || undefined })}
          />
          <TextField
            label="To"
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => updateFilter({ to: e.target.value || undefined })}
          />
        </div>
      </div>

      <DataTable
        data={data?.items}
        isLoading={isLoading}
        emptyMessage="No audit log entries match these filters."
        getRowKey={(a) => a.id}
        onRowClick={(a) => setViewingId(a.id)}
        columns={[
          { header: "Time", render: (a) => new Date(a.createdAt).toLocaleString() },
          { header: "User", render: (a) => a.actorName ?? "Unknown" },
          {
            header: "Action",
            render: (a) => {
              const verb = verbFromAction(a.action);
              return (
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${VERB_BADGE_CLASSES[verb] ?? "bg-slate-100 text-slate-600"}`}>
                  {VERB_LABELS[verb] ?? verb}
                </span>
              );
            },
          },
          { header: "Entity", render: (a) => formatEntityType(a.entityType) },
          { header: "Details", render: (a) => <span className="font-mono text-xs text-slate-400">{a.action}</span> },
        ]}
        renderActions={(a) => (
          <button
            onClick={() => setViewingId(a.id)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="View details"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
      />

      {total > limit && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {page} of {pageCount} ({total} entries)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((f) => ({ ...f, offset: Math.max(0, offset - limit) }))}
              disabled={offset === 0}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setFilters((f) => ({ ...f, offset: offset + limit }))}
              disabled={offset + limit >= total}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <AuditLogDetailModal id={viewingId} onClose={() => setViewingId(null)} />
    </div>
  );
}
