import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { useToast } from "../../components/Toast";
import { useStudentPortalPayments } from "../../hooks/use-student-portal";
import { formatCurrency } from "../../lib/format";

const CHARGE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-400",
};

export function StudentPaymentsPage() {
  const { data, isLoading } = useStudentPortalPayments();
  const { showToast } = useToast();
  const [payClicked, setPayClicked] = useState(false);

  const balance = data?.balance ?? 0;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Payments</h1>

      <div className={`mb-6 rounded-xl p-6 text-center shadow-sm ${balance > 0 ? "bg-red-50" : "bg-green-50"}`}>
        <p className="text-xs font-medium uppercase text-slate-500">Balance</p>
        <p className={`mt-1 text-3xl font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
          {isLoading ? "-" : formatCurrency(balance, "UZS")}
        </p>
        <button
          onClick={() => {
            setPayClicked(true);
            showToast("Please contact reception to complete your payment.");
          }}
          disabled={balance <= 0}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pay Now
        </button>
        {payClicked && <p className="mt-2 text-xs text-slate-500">Contact reception to complete your payment.</p>}
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Charges</h2>
        <DataTable
          data={data?.charges}
          isLoading={isLoading}
          emptyMessage="No charges on file."
          getRowKey={(c) => c.id}
          columns={[
            { header: "Description", render: (c) => c.description ?? "-" },
            { header: "Amount", render: (c) => formatCurrency(c.amount, c.currency) },
            { header: "Due date", render: (c) => new Date(c.dueDate).toLocaleDateString() },
            {
              header: "Status",
              render: (c) => (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CHARGE_STATUS_STYLES[c.status]}`}>
                  {c.status}
                </span>
              ),
            },
          ]}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Payments</h2>
        <DataTable
          data={data?.payments}
          isLoading={isLoading}
          emptyMessage="No payments on file."
          getRowKey={(p) => p.id}
          columns={[
            { header: "Amount", render: (p) => formatCurrency(p.amount, p.currency) },
            { header: "Date", render: (p) => new Date(p.date).toLocaleDateString() },
            { header: "Method", render: (p) => <span className="capitalize">{p.method.replace("_", " ")}</span> },
          ]}
        />
      </div>
    </div>
  );
}
