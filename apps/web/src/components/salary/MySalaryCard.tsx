import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";
import { PaymentStatusBadge } from "./SalaryStatusBadge";
import { useTeacherOwnSalary } from "../../hooks/use-salary";
import { formatCurrency } from "../../lib/format";

const TYPE_LABELS: Record<string, string> = {
  fixed: "Fixed",
  hourly: "Hourly",
  per_student: "Per Student",
};

export function MySalaryCard() {
  const { data: salary, isLoading } = useTeacherOwnSalary();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Loading salary...</p>
      </div>
    );
  }

  if (!salary) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <Wallet size={18} />
          <span className="text-sm font-medium">My Salary</span>
        </div>
        <p className="mt-3 text-sm text-slate-500">Salary not yet configured. Contact administration.</p>
      </div>
    );
  }

  const recentPayments = salary.paymentHistory.slice(0, 3);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          <Wallet size={18} />
          <span className="text-sm font-medium">My Salary</span>
        </div>
        <PaymentStatusBadge status={salary.thisMonthPaymentStatus} />
      </div>

      <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(salary.amount, salary.currency)}</p>
      <p className="mt-1 text-xs text-slate-500">
        {TYPE_LABELS[salary.type] ?? salary.type} · Last paid{" "}
        {salary.lastPaidAt ? new Date(salary.lastPaidAt).toLocaleDateString() : "—"}
      </p>

      {recentPayments.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
          {recentPayments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{p.month}</span>
              <span className="font-medium text-slate-700">{formatCurrency(p.amount, p.currency)}</span>
              <PaymentStatusBadge status={p.status} />
            </div>
          ))}
        </div>
      )}

      <Link
        to="/teacher/salary"
        className="mt-4 block rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        View full details
      </Link>
    </div>
  );
}
