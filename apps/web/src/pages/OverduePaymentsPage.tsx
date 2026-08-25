import type { OverdueChargeDto, ReminderType } from "@crm/shared-types";
import { AlertTriangle, Loader2, MessageCircle, MessageSquare } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { useToast } from "../components/Toast";
import { SelectField } from "../components/form/Field";
import { useBranches } from "../hooks/use-branches";
import { useCreatePayment, useFinancialAccounts } from "../hooks/use-finance";
import { OverdueChargesFilters, useOverdueCharges, useSendReminder } from "../hooks/use-reminders";
import { useCurrentSubscription } from "../hooks/use-subscription";
import { LockedFeaturePage } from "../components/subscription/LockedFeaturePage";
import { useTheme } from "../contexts/ThemeContext";
import { parsePlanLockError } from "../lib/plan-lock";
import { formatCurrency } from "../lib/format";
import { useUserRole } from "../stores/auth.store";

interface PendingSend {
  charges: OverdueChargeDto[];
  type: ReminderType;
}

export function OverduePaymentsPage() {
  const role = useUserRole();
  // Recording a payment is receptionist-only (see FinancePage.tsx and the
  // backend guard on POST /payments) — owner/admin get this page read-only,
  // minus the Mark Paid action, even though the route is shared.
  const canRecordPayments = role === "reception";
  const { branding } = useTheme();
  const hasBranches = (branding as { hasBranches?: boolean } | null)?.hasBranches ?? true;
  const [branchId, setBranchId] = useState("");
  const [minDaysOverdue, setMinDaysOverdue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingSend, setPendingSend] = useState<PendingSend | null>(null);
  const [markingPaid, setMarkingPaid] = useState<OverdueChargeDto | null>(null);

  const filters: OverdueChargesFilters = {
    branchId: branchId || undefined,
    minDaysOverdue: minDaysOverdue ? Number(minDaysOverdue) : undefined,
  };
  const { data: branches } = useBranches();
  const { data: charges, isLoading, error: chargesError } = useOverdueCharges(filters);
  const sendReminder = useSendReminder();
  const { data: accounts } = useFinancialAccounts();
  const createPayment = useCreatePayment();
  const { showToast } = useToast();

  const lockInfo = parsePlanLockError(chargesError);
  const { data: currentSub } = useCurrentSubscription(Boolean(lockInfo));

  const totalOverdueAmount = charges?.reduce((sum, c) => sum + c.amount, 0) ?? 0;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!charges) return;
    setSelectedIds((prev) => (prev.size === charges.length ? new Set() : new Set(charges.map((c) => c.id))));
  }

  async function confirmSend() {
    if (!pendingSend) return;
    try {
      for (const charge of pendingSend.charges) {
        await sendReminder.mutateAsync({ chargeId: charge.id, type: pendingSend.type });
      }
      showToast(
        pendingSend.charges.length > 1
          ? `Sent ${pendingSend.charges.length} reminders.`
          : "Reminder sent.",
      );
      setSelectedIds(new Set());
      setPendingSend(null);
    } catch {
      showToast("Failed to send reminder.", "error");
    }
  }

  async function confirmMarkPaid() {
    if (!markingPaid) return;
    const account = accounts?.[0];
    if (!account) {
      showToast("No financial account available to record this payment.", "error");
      return;
    }
    try {
      await createPayment.mutateAsync({
        branchId: markingPaid.branchId,
        studentId: markingPaid.studentId,
        financialAccountId: account.id,
        amount: markingPaid.amount,
        currency: markingPaid.currency,
        paymentMethod: "cash",
        chargeId: markingPaid.id,
      });
      showToast("Payment recorded.");
      setMarkingPaid(null);
    } catch {
      showToast("Failed to record payment.", "error");
    }
  }

  const selectedCharges = charges?.filter((c) => selectedIds.has(c.id)) ?? [];

  if (lockInfo) {
    return <LockedFeaturePage featureName="Payment Reminders" requiredPlan={lockInfo.requiredPlan} currentPlan={currentSub?.plan.slug} />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Overdue Payments</h1>
      </div>

      {!isLoading && charges && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-700">
            {charges.length === 0
              ? "No students are currently overdue."
              : `${charges.length} student${charges.length > 1 ? "s" : ""} overdue, totaling ${formatCurrency(totalOverdueAmount, "UZS")}`}
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-4">
        {hasBranches && (
          <div className="w-48">
            <SelectField label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All branches</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectField>
          </div>
        )}
        <div className="w-48">
          <SelectField
            label="Days overdue"
            value={minDaysOverdue}
            onChange={(e) => setMinDaysOverdue(e.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1+ days</option>
            <option value="7">7+ days</option>
            <option value="14">14+ days</option>
            <option value="30">30+ days</option>
          </SelectField>
        </div>
        {selectedCharges.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setPendingSend({ charges: selectedCharges, type: "sms" })}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <MessageSquare className="h-4 w-4" />
              Send SMS ({selectedCharges.length})
            </button>
            <button
              onClick={() => setPendingSend({ charges: selectedCharges, type: "whatsapp" })}
              className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              Send WhatsApp ({selectedCharges.length})
            </button>
          </div>
        )}
      </div>

      <DataTable
        data={charges}
        isLoading={isLoading}
        emptyMessage="No overdue payments."
        getRowKey={(c) => c.id}
        columns={[
          {
            header: "",
            render: (c) => (
              <input
                type="checkbox"
                checked={selectedIds.has(c.id)}
                onChange={() => toggleSelected(c.id)}
                onClick={(e) => e.stopPropagation()}
              />
            ),
          },
          { header: "Student", render: (c) => c.student?.name ?? "-" },
          {
            header: "Parent / phone",
            render: (c) => c.student?.phone ?? "-",
          },
          { header: "Amount", render: (c) => formatCurrency(c.amount, c.currency) },
          { header: "Due date", render: (c) => new Date(c.dueDate).toLocaleDateString() },
          {
            header: "Days overdue",
            render: (c) => (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.daysOverdue > 7 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {c.daysOverdue} days
              </span>
            ),
          },
          {
            header: "Last reminder",
            render: (c) =>
              c.lastReminder
                ? `${c.lastReminder.type.toUpperCase()} · ${c.lastReminder.status} · ${new Date(c.lastReminder.createdAt).toLocaleDateString()}`
                : "Never",
          },
        ]}
        renderActions={(c) => (
          <>
            {canRecordPayments && (
              <button
                onClick={() => setMarkingPaid(c)}
                className="rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                Mark Paid
              </button>
            )}
            <button
              onClick={() => setPendingSend({ charges: [c], type: "sms" })}
              className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
              aria-label="Send SMS"
              title="Send SMS"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPendingSend({ charges: [c], type: "whatsapp" })}
              className="rounded p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600"
              aria-label="Send WhatsApp"
              title="Send WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </>
        )}
      />

      {charges && charges.length > 0 && (
        <div className="mt-2">
          <button onClick={toggleSelectAll} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            {selectedIds.size === charges.length ? "Deselect all" : "Select all"}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(markingPaid)}
        title="Mark as paid"
        message={
          markingPaid
            ? `Record a ${formatCurrency(markingPaid.amount, markingPaid.currency)} cash payment for ${markingPaid.student?.name ?? "this student"}?`
            : ""
        }
        confirmLabel={createPayment.isPending ? "Recording..." : "Mark Paid"}
        isConfirming={createPayment.isPending}
        onConfirm={confirmMarkPaid}
        onCancel={() => setMarkingPaid(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingSend)}
        title={pendingSend && pendingSend.charges.length > 1 ? "Send reminders" : "Send reminder"}
        message={
          pendingSend
            ? `Send a mock ${pendingSend.type.toUpperCase()} reminder to ${pendingSend.charges.length} student${pendingSend.charges.length > 1 ? "s" : ""}?`
            : ""
        }
        confirmLabel={sendReminder.isPending ? "Sending..." : "Send"}
        isConfirming={sendReminder.isPending}
        onConfirm={confirmSend}
        onCancel={() => setPendingSend(null)}
      />
      {sendReminder.isPending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm text-slate-600 shadow-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          Sending...
        </div>
      )}
    </div>
  );
}
