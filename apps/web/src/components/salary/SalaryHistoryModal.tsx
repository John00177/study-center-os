import { useState } from "react";
import type { SalaryPaymentDto, TeacherSalaryLineDto } from "@crm/shared-types";
import { Printer } from "lucide-react";
import { Modal } from "../Modal";
import { DataTable } from "../DataTable";
import { PaymentStatusBadge } from "./SalaryStatusBadge";
import { SalarySlip } from "./SalarySlip";
import { useSalaryPaymentHistory } from "../../hooks/use-salary";
import { formatCurrency } from "../../lib/format";

interface SalaryHistoryModalProps {
  salary: TeacherSalaryLineDto | null;
  onClose: () => void;
}

export function SalaryHistoryModal({ salary, onClose }: SalaryHistoryModalProps) {
  const { data: payments, isLoading } = useSalaryPaymentHistory(salary?.id ?? null);
  const [printing, setPrinting] = useState<SalaryPaymentDto | null>(null);

  const thisYear = new Date().getFullYear();
  const totalPaidThisYear = (payments ?? [])
    .filter((p) => p.status === "paid" && p.month.startsWith(String(thisYear)))
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <Modal
        open={Boolean(salary) && !printing}
        onClose={onClose}
        title={`Payment History — ${salary?.teacherName ?? ""}`}
        widthClassName="max-w-xl"
      >
        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Total paid this year ({thisYear})</p>
          <p className="text-lg font-semibold text-slate-900">{formatCurrency(totalPaidThisYear, salary?.currency ?? "UZS")}</p>
        </div>

        <DataTable
          data={payments}
          isLoading={isLoading}
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
      </Modal>

      <Modal open={Boolean(printing)} onClose={() => setPrinting(null)} title="Salary Slip" widthClassName="max-w-lg">
        {printing && salary && (
          <SalarySlip
            teacherName={salary.teacherName}
            month={printing.month}
            amount={printing.amount}
            currency={printing.currency}
            paidAt={printing.paidAt}
            paymentMethod={printing.paymentMethod}
          />
        )}
      </Modal>
    </>
  );
}
