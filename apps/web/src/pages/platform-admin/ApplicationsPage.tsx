import type { ApplicationDto } from "@crm/shared-types";
import { Check, Eye, Loader2, X } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { SelectField, TextField } from "../../components/form/Field";
import {
  useApproveApplication,
  usePendingApplications,
  useRejectApplication,
  useSubscriptionPlans,
} from "../../hooks/use-platform-admin";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function ViewApplicationModal({ application, onClose }: { application: ApplicationDto | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(application)} onClose={onClose} title={application?.name ?? "Application"}>
      {application && (
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Study Center</p>
            <p className="text-slate-900">{application.name}</p>
            <p className="text-slate-500">studycenter.uz/{application.slug}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Owner</p>
            <p className="text-slate-900">{application.ownerName ?? "-"}</p>
            <p className="text-slate-500">{application.ownerEmail}</p>
            <p className="text-slate-500">{application.ownerPhone}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Location</p>
            <p className="text-slate-900">
              {application.city}, {application.country}
            </p>
            {application.address && <p className="text-slate-500">{application.address}</p>}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Applied</p>
            <p className="text-slate-900">{new Date(application.createdAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ApproveApplicationModal({
  application,
  onClose,
  onApproved,
}: {
  application: ApplicationDto | null;
  onClose: () => void;
  onApproved: (name: string) => void;
}) {
  const { data: plans } = useSubscriptionPlans();
  const approve = useApproveApplication();
  const [planId, setPlanId] = useState("");

  async function handleConfirm() {
    if (!application) return;
    await approve.mutateAsync({ id: application.id, planId: planId || undefined });
    onApproved(application.name);
    onClose();
  }

  return (
    <Modal open={Boolean(application)} onClose={onClose} title="Approve Application" widthClassName="max-w-sm">
      {application && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Approve <span className="font-medium text-slate-900">{application.name}</span> and activate their trial?
          </p>
          <SelectField label="Subscription plan (optional)" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">No plan — trial only</option>
            {plans?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatUsd(p.price)}/{p.interval}
              </option>
            ))}
          </SelectField>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={approve.isPending}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={approve.isPending}
              className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {approve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Approve
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ApplicationsPage() {
  const { data: applications, isLoading } = usePendingApplications();
  const { showToast } = useToast();
  const [viewing, setViewing] = useState<ApplicationDto | null>(null);
  const [approving, setApproving] = useState<ApplicationDto | null>(null);
  const [rejecting, setRejecting] = useState<ApplicationDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const reject = useRejectApplication();

  async function handleReject() {
    if (!rejecting) return;
    try {
      await reject.mutateAsync({ id: rejecting.id, reason: rejectReason.trim() || undefined });
      showToast("Application rejected");
      setRejecting(null);
      setRejectReason("");
    } catch {
      showToast("Failed to reject application", "error");
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">Applications</h1>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <DataTable
          data={applications}
          isLoading={isLoading}
          emptyMessage="No pending applications."
          getRowKey={(a) => a.id}
          columns={[
            { header: "Organization Name", render: (a) => a.name },
            { header: "Owner Name", render: (a) => a.ownerName ?? "-" },
            { header: "Email", render: (a) => a.ownerEmail ?? "-" },
            { header: "Phone", render: (a) => a.ownerPhone ?? "-" },
            { header: "Location", render: (a) => [a.city, a.country].filter(Boolean).join(", ") || "-" },
            { header: "Applied", render: (a) => new Date(a.createdAt).toLocaleDateString() },
          ]}
          renderActions={(a) => (
            <>
              <button
                onClick={() => setViewing(a)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="View"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => setApproving(a)}
                className="rounded p-1.5 text-slate-400 hover:bg-green-900 hover:text-green-400"
                aria-label="Approve"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRejecting(a)}
                className="rounded p-1.5 text-slate-400 hover:bg-red-900 hover:text-red-400"
                aria-label="Reject"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        />
      </div>

      <ViewApplicationModal application={viewing} onClose={() => setViewing(null)} />

      <ApproveApplicationModal
        application={approving}
        onClose={() => setApproving(null)}
        onApproved={(name) => showToast(`${name} approved and activated`)}
      />

      <Modal
        open={Boolean(rejecting)}
        onClose={() => {
          setRejecting(null);
          setRejectReason("");
        }}
        title="Reject Application"
        widthClassName="max-w-sm"
      >
        {rejecting && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Reject <span className="font-medium text-slate-900">{rejecting.name}</span>'s application?
            </p>
            <TextField
              label="Reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setRejecting(null);
                  setRejectReason("");
                }}
                disabled={reject.isPending}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={reject.isPending}
                className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {reject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Reject
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
