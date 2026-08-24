import { useState } from "react";
import type { TeacherSalaryLineDto } from "@crm/shared-types";
import { CheckCheck, Loader2, Plus } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { useToast } from "../components/Toast";
import { PaymentStatusBadge, SalaryStatusBadge } from "../components/salary/SalaryStatusBadge";
import { SetSalaryModal } from "../components/salary/SetSalaryModal";
import { RecordPaymentModal } from "../components/salary/RecordPaymentModal";
import { SalaryHistoryModal } from "../components/salary/SalaryHistoryModal";
import { useMarkAllSalariesPaid, useSalaries } from "../hooks/use-salary";
import { formatCurrency } from "../lib/format";

const TYPE_LABELS: Record<string, string> = {
  fixed: "Fixed",
  hourly: "Hourly",
  per_student: "Per Student",
};

export function TeacherSalariesPage() {
  const { data: salaries, isLoading } = useSalaries();
  const markAllPaid = useMarkAllSalariesPaid();
  const { showToast } = useToast();

  const [salaryFormOpen, setSalaryFormOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<TeacherSalaryLineDto | null>(null);
  const [payingSalary, setPayingSalary] = useState<TeacherSalaryLineDto | null>(null);
  const [historySalary, setHistorySalary] = useState<TeacherSalaryLineDto | null>(null);

  const pendingCount = salaries?.filter((s) => s.thisMonthPaymentStatus !== "paid").length ?? 0;

  async function handleMarkAllPaid() {
    try {
      await markAllPaid.mutateAsync();
      showToast("All pending salaries marked as paid.");
    } catch {
      showToast("Failed to mark salaries as paid.", "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Teacher Salaries</h1>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <button
              onClick={handleMarkAllPaid}
              disabled={markAllPaid.isPending}
              className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-60"
            >
              {markAllPaid.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Mark All as Paid ({pendingCount})
            </button>
          )}
          <button
            onClick={() => {
              setEditingSalary(null);
              setSalaryFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Set Salary
          </button>
        </div>
      </div>

      <DataTable
        data={salaries}
        isLoading={isLoading}
        emptyMessage="No teacher salaries configured yet."
        getRowKey={(s) => s.id}
        columns={[
          { header: "Teacher", render: (s) => s.teacherName },
          { header: "Current Salary", render: (s) => formatCurrency(s.amount, s.currency) },
          { header: "Type", render: (s) => TYPE_LABELS[s.type] ?? s.type },
          { header: "Status", render: (s) => <SalaryStatusBadge status={s.status} /> },
          { header: "This Month Payment", render: (s) => <PaymentStatusBadge status={s.thisMonthPaymentStatus} /> },
          { header: "Last Paid", render: (s) => (s.lastPaidAt ? new Date(s.lastPaidAt).toLocaleDateString() : "—") },
        ]}
        renderActions={(s) => (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setEditingSalary(s);
                setSalaryFormOpen(true);
              }}
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit Salary
            </button>
            {s.thisMonthPaymentStatus !== "paid" && (
              <button
                onClick={() => setPayingSalary(s)}
                className="rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                Record Payment
              </button>
            )}
            <button
              onClick={() => setHistorySalary(s)}
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              View History
            </button>
          </div>
        )}
      />

      <SetSalaryModal open={salaryFormOpen} onClose={() => setSalaryFormOpen(false)} editing={editingSalary} />
      <RecordPaymentModal open={Boolean(payingSalary)} onClose={() => setPayingSalary(null)} salary={payingSalary} />
      <SalaryHistoryModal salary={historySalary} onClose={() => setHistorySalary(null)} />
    </div>
  );
}
