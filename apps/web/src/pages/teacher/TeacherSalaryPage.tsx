import { useState } from "react";
import type { SalaryPaymentDto } from "@crm/shared-types";
import { Printer, Wallet } from "lucide-react";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { PaymentStatusBadge, SalaryStatusBadge } from "../../components/salary/SalaryStatusBadge";
import { SalarySlip } from "../../components/salary/SalarySlip";
import { useTeacherOwnSalary } from "../../hooks/use-salary";
import { formatCurrency } from "../../lib/format";
import { useAuthStore } from "../../stores/auth.store";

const TYPE_LABELS: Record<string, string> = {
  fixed: "Fixed Monthly",
  hourly: "Hourly",
  per_student: "Per Student",
};

export function TeacherSalaryPage() {
  const { data: salary, isLoading } = useTeacherOwnSalary();
  const user = useAuthStore((state) => state.user);
  const [printing, setPrinting] = useState<SalaryPaymentDto | null>(null);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (!salary) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">My Salary</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <Wallet className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Salary not yet configured. Contact administration.</p>
        </div>
      </div>
    );
  }

  const latestPaid = salary.paymentHistory.find((p) => p.status === "paid");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">My Salary</h1>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Monthly Salary</span>
            <SalaryStatusBadge status={salary.status} />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatCurrency(salary.amount, salary.currency)}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Type</dt>
              <dd className="font-medium text-slate-900">{TYPE_LABELS[salary.type] ?? salary.type}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Effective From</dt>
              <dd className="font-medium text-slate-900">{new Date(salary.effectiveFrom).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">This Month</dt>
              <dd>
                <PaymentStatusBadge status={salary.thisMonthPaymentStatus} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Last Paid</dt>
              <dd className="font-medium text-slate-900">
                {salary.lastPaidAt ? new Date(salary.lastPaidAt).toLocaleDateString() : "—"}
              </dd>
            </div>
          </dl>
          {latestPaid && (
            <button
              onClick={() => setPrinting(latestPaid)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Printer className="h-4 w-4" />
              Print Slip
            </button>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Payment History</h2>
        <DataTable
          data={salary.paymentHistory}
          isLoading={false}
          emptyMessage="No payment records yet."
          getRowKey={(p) => p.id}
          columns={[
            { header: "Month", render: (p) => p.month },
            { header: "Amount", render: (p) => formatCurrency(p.amount, p.currency) },
            { header: "Status", render: (p) => <PaymentStatusBadge status={p.status} /> },
            { header: "Paid Date", render: (p) => (p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—") },
            { header: "Method", render: (p) => <span className="capitalize">{p.paymentMethod?.replace("_", " ") ?? "—"}</span> },
          ]}
          renderActions={(p) => (
            <button
              onClick={() => setPrinting(p)}
              disabled={p.status !== "paid"}
              className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Print slip"
              title={p.status === "paid" ? "Print slip" : "Only paid months have a slip"}
            >
              <Printer className="h-4 w-4" />
            </button>
          )}
        />
      </div>

      <Modal open={Boolean(printing)} onClose={() => setPrinting(null)} title="Salary Slip" widthClassName="max-w-lg">
        {printing && (
          <SalarySlip
            teacherName={user?.name ?? "Teacher"}
            month={printing.month}
            amount={printing.amount}
            currency={printing.currency}
            paidAt={printing.paidAt}
            paymentMethod={printing.paymentMethod}
          />
        )}
      </Modal>
    </div>
  );
}
