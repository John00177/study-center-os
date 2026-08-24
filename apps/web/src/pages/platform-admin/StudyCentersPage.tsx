import type { OrganizationStatus } from "@crm/shared-types";
import { Eye, Loader2, Pause, Play } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DataTable } from "../../components/DataTable";
import { useToast } from "../../components/Toast";
import { SelectField, TextField } from "../../components/form/Field";
import { OrganizationDetailModal } from "../../components/platform-admin/OrganizationDetailModal";
import {
  useActivateOrganization,
  useOrganizations,
  useSuspendOrganization,
} from "../../hooks/use-platform-admin";
import { formatCurrency } from "../../lib/format";

export function StudyCentersPage() {
  const [status, setStatus] = useState<OrganizationStatus | "">("");
  const [search, setSearch] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  const { data, isLoading } = useOrganizations(status ? { status } : {});
  const suspend = useSuspendOrganization();
  const activate = useActivateOrganization();
  const { showToast } = useToast();

  const filtered = (data ?? []).filter((org) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return org.name.toLowerCase().includes(q) || (org.ownerEmail ?? "").toLowerCase().includes(q);
  });

  async function confirmSuspend() {
    if (!suspendingId) return;
    try {
      await suspend.mutateAsync({ id: suspendingId });
      showToast("Study center suspended.");
      setSuspendingId(null);
    } catch {
      showToast("Failed to suspend study center.", "error");
    }
  }

  async function handleActivate(id: string) {
    try {
      await activate.mutateAsync(id);
      showToast("Study center activated.");
    } catch {
      showToast("Failed to activate study center.", "error");
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">Study Centers</h1>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="w-56">
          <TextField
            label="Search"
            placeholder="Name or owner email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as OrganizationStatus | "")}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </SelectField>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <DataTable
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No study centers found."
          getRowKey={(o) => o.id}
          columns={[
            { header: "Name", render: (o) => <span className="font-medium text-white">{o.name}</span> },
            { header: "Email", render: (o) => o.ownerEmail ?? "-" },
            { header: "Phone", render: (o) => o.ownerPhone ?? "-" },
            { header: "Location", render: (o) => [o.city, o.country].filter(Boolean).join(", ") || "-" },
            { header: "Status", render: (o) => <span className="capitalize">{o.status}</span> },
            { header: "Plan", render: (o) => o.subscription?.planName ?? "-" },
            { header: "Students", render: (o) => o.stats.studentCount, align: "right" },
            { header: "Revenue", render: (o) => formatCurrency(o.stats.totalRevenue, "UZS"), align: "right" },
          ]}
          renderActions={(o) => (
            <>
              <button
                onClick={() => setViewingId(o.id)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="View detail"
              >
                <Eye className="h-4 w-4" />
              </button>
              {o.status === "suspended" ? (
                <button
                  onClick={() => handleActivate(o.id)}
                  disabled={activate.isPending}
                  className="rounded p-1.5 text-slate-400 hover:bg-green-900 hover:text-green-400 disabled:opacity-60"
                  aria-label="Activate"
                >
                  {activate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </button>
              ) : (
                <button
                  onClick={() => setSuspendingId(o.id)}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-900 hover:text-red-400"
                  aria-label="Suspend"
                >
                  <Pause className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        />
      </div>

      <OrganizationDetailModal open={Boolean(viewingId)} onClose={() => setViewingId(null)} organizationId={viewingId} />

      <ConfirmDialog
        open={Boolean(suspendingId)}
        title="Suspend study center"
        message="Are you sure you want to suspend this study center? Their staff will lose access."
        confirmLabel={suspend.isPending ? "Suspending..." : "Suspend"}
        isConfirming={suspend.isPending}
        onConfirm={confirmSuspend}
        onCancel={() => setSuspendingId(null)}
      />
    </div>
  );
}
