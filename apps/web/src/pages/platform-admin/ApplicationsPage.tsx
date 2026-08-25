import type { ApplicationDto } from "@crm/shared-types";
import { Check, Eye, Loader2, X } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { SelectField, TextField } from "../../components/form/Field";
import { useTranslation } from "../../hooks/use-translation";
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
  const { t } = useTranslation();
  return (
    <Modal open={Boolean(application)} onClose={onClose} title={application?.name ?? "Application"}>
      {application && (
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">{t("Study Center")}</p>
            <p className="text-slate-900">{application.name}</p>
            <p className="text-slate-500">studycenter.uz/{application.slug}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">{t("Owner")}</p>
            <p className="text-slate-900">{application.ownerName ?? "-"}</p>
            <p className="text-slate-500">{application.ownerEmail}</p>
            <p className="text-slate-500">{application.ownerPhone}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">{t("Location")}</p>
            <p className="text-slate-900">
              {application.city}, {application.country}
            </p>
            {application.address && <p className="text-slate-500">{application.address}</p>}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">{t("Applied")}</p>
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
  const { t } = useTranslation();
  const { data: plans } = useSubscriptionPlans();
  const approve = useApproveApplication();
  const [planId, setPlanId] = useState("");
  const [hasBranches, setHasBranches] = useState(false);

  async function handleConfirm() {
    if (!application) return;
    await approve.mutateAsync({ id: application.id, planId: planId || undefined, hasBranches });
    onApproved(application.name);
    onClose();
  }

  return (
    <Modal open={Boolean(application)} onClose={onClose} title={t("Approve Application")} widthClassName="max-w-sm">
      {application && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {t("Approve")}<span className="font-medium text-slate-900">{application.name}</span> and activate their trial?
          </p>
          <SelectField label={t("Subscription plan (optional)")} value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">{t("No plan — trial only")}</option>
            {plans?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatUsd(p.price)}/{p.interval}
              </option>
            ))}
          </SelectField>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={hasBranches}
              onChange={(e) => setHasBranches(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            {t("This study center has multiple branches")}
          </label>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={approve.isPending}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {t("Cancel")}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={approve.isPending}
              className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {approve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Approve")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ApplicationsPage() {
  const { t } = useTranslation();
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
      showToast(t("Application rejected"));
      setRejecting(null);
      setRejectReason("");
    } catch {
      showToast(t("Failed to reject application"), "error");
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">{t("Applications")}</h1>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <DataTable
          data={applications}
          isLoading={isLoading}
          emptyMessage={t("No pending applications.")}
          getRowKey={(a) => a.id}
          columns={[
            { header: t("Organization Name"), render: (a) => a.name },
            { header: t("Owner Name"), render: (a) => a.ownerName ?? "-" },
            { header: t("Email"), render: (a) => a.ownerEmail ?? "-" },
            { header: t("Phone"), render: (a) => a.ownerPhone ?? "-" },
            { header: t("Location"), render: (a) => [a.city, a.country].filter(Boolean).join(", ") || "-" },
            { header: t("Applied"), render: (a) => new Date(a.createdAt).toLocaleDateString() },
          ]}
          renderActions={(a) => (
            <>
              <button
                onClick={() => setViewing(a)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label={t("View")}
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => setApproving(a)}
                className="rounded p-1.5 text-slate-400 hover:bg-green-900 hover:text-green-400"
                aria-label={t("Approve")}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRejecting(a)}
                className="rounded p-1.5 text-slate-400 hover:bg-red-900 hover:text-red-400"
                aria-label={t("Reject")}
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
        title={t("Reject Application")}
        widthClassName="max-w-sm"
      >
        {rejecting && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {t("Reject")}<span className="font-medium text-slate-900">{rejecting.name}</span>'s application?
            </p>
            <TextField
              label={t("Reason (optional)")}
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
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={reject.isPending}
                className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {reject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("Reject")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
