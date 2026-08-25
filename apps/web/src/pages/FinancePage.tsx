import type { ChargeDto, ChargeStatus, ChargesSortBy, PaymentDto } from "@crm/shared-types";
import { AlertTriangle, CheckCircle2, Clock, HandCoins, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { SelectField, TextField } from "../components/form/Field";
import { PAYMENT_METHOD_OPTIONS, PaymentMethodBadge } from "../components/finance/PaymentMethodBadge";
import { ReminderStatsWidget } from "../components/reminders/ReminderStatsWidget";
import { PaymentStatusBadge, SalaryStatusBadge } from "../components/salary/SalaryStatusBadge";
import { useBranches } from "../hooks/use-branches";
import { useGroups } from "../hooks/use-groups";
import { useStudents } from "../hooks/use-students";
import {
  ChargeInput,
  PaymentInput,
  useCharges,
  useCreateCharge,
  useCreatePayment,
  useDeleteCharge,
  useDeletePayment,
  useFinancialAccounts,
  usePaymentSummary,
  usePayments,
} from "../hooks/use-finance";
import { useSalaries, useSalaryAnalytics } from "../hooks/use-salary";
import { formatCurrency } from "../lib/format";
import { useUserRole } from "../stores/auth.store";

function defaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { periodStartDate: toIso(start), periodEndDate: toIso(end) };
}

function formatPeriod(startIso?: string | null, endIso?: string | null): string {
  if (!startIso || !endIso) return "-";
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(startIso)} - ${fmt(endIso)}`;
}

const CHARGE_STATUS_STYLES: Record<ChargeStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-400",
};

function ChargeForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: students } = useStudents();
  const { data: branches } = useBranches();
  const createCharge = useCreateCharge();
  const { showToast } = useToast();
  const [form, setForm] = useState({ studentId: "", branchId: "", amount: "", description: "", dueDate: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm({ studentId: "", branchId: "", amount: "", description: "", dueDate: "" });
      setErrors({});
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.studentId) nextErrors.studentId = "Student is required.";
    if (!form.branchId) nextErrors.branchId = "Branch is required.";
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = "Enter a valid amount.";
    if (!form.dueDate) nextErrors.dueDate = "Due date is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const input: ChargeInput = {
      branchId: form.branchId,
      studentId: form.studentId,
      amount: Number(form.amount),
      currency: "UZS",
      description: form.description.trim() || undefined,
      dueDate: form.dueDate,
    };

    try {
      await createCharge.mutateAsync(input);
      showToast("Charge created.");
      onClose();
    } catch {
      showToast("Failed to create charge.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Charge">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Student"
          required
          value={form.studentId}
          error={errors.studentId}
          onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
        >
          <option value="">Select student</option>
          {students?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Branch"
          required
          value={form.branchId}
          error={errors.branchId}
          onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
        >
          <option value="">Select branch</option>
          {branches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Amount (UZS)"
          type="number"
          min="0"
          required
          value={form.amount}
          error={errors.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <TextField
          label="Due date"
          type="date"
          required
          value={form.dueDate}
          error={errors.dueDate}
          onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
        />

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createCharge.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createCharge.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {createCharge.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create charge
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: students } = useStudents();
  const { data: accounts } = useFinancialAccounts();
  const createPayment = useCreatePayment();
  const { showToast } = useToast();
  const [form, setForm] = useState({ studentId: "", financialAccountId: "", amount: "", paymentMethod: "cash", ...defaultPeriod() });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm({ studentId: "", financialAccountId: "", amount: "", paymentMethod: "cash", ...defaultPeriod() });
      setErrors({});
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.studentId) nextErrors.studentId = "Student is required.";
    if (!form.financialAccountId) nextErrors.financialAccountId = "Account is required.";
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = "Enter a valid amount.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const account = accounts?.find((a) => a.id === form.financialAccountId);

    const input: PaymentInput = {
      branchId: account?.branchId ?? "",
      studentId: form.studentId,
      financialAccountId: form.financialAccountId,
      amount: Number(form.amount),
      currency: "UZS",
      paymentMethod: form.paymentMethod,
      periodStartDate: form.periodStartDate || undefined,
      periodEndDate: form.periodEndDate || undefined,
    };

    try {
      await createPayment.mutateAsync(input);
      showToast("Payment recorded.");
      onClose();
    } catch {
      showToast("Failed to record payment.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Student"
          required
          value={form.studentId}
          error={errors.studentId}
          onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
        >
          <option value="">Select student</option>
          {students?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Account"
          required
          value={form.financialAccountId}
          error={errors.financialAccountId}
          onChange={(e) => setForm((f) => ({ ...f, financialAccountId: e.target.value }))}
        >
          <option value="">Select account</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Amount (UZS)"
          type="number"
          min="0"
          required
          value={form.amount}
          error={errors.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        />
        <SelectField
          label="Payment method"
          value={form.paymentMethod}
          onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
        >
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Period start"
            type="date"
            value={form.periodStartDate}
            onChange={(e) => setForm((f) => ({ ...f, periodStartDate: e.target.value }))}
          />
          <TextField
            label="Period end"
            type="date"
            value={form.periodEndDate}
            onChange={(e) => setForm((f) => ({ ...f, periodEndDate: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            disabled={createPayment.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPayment.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {createPayment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Record payment
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SummaryCard({
  label,
  value,
  colorClass,
  icon,
}: {
  label: string;
  value: string;
  colorClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {icon}
      </div>
      <p className={`mt-2 text-2xl font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
}

function StudentHistoryModal({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const { data: allCharges } = useCharges();
  const { data: allPayments } = usePayments();
  const charges = allCharges?.filter((c) => c.studentId === studentId) ?? [];
  const payments = allPayments?.filter((p) => p.studentId === studentId) ?? [];
  const studentName = charges[0]?.student?.name ?? payments[0]?.student?.name ?? "Student";

  return (
    <Modal open={Boolean(studentId)} onClose={onClose} title={`Payment history — ${studentName}`} widthClassName="max-w-xl">
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Charges</h3>
          <DataTable
            data={charges}
            isLoading={false}
            emptyMessage="No charges."
            getRowKey={(c) => c.id}
            columns={[
              { header: "Description", render: (c) => c.description ?? "-" },
              { header: "Amount", render: (c) => formatCurrency(c.amount, c.currency) },
              { header: "Due", render: (c) => new Date(c.dueDate).toLocaleDateString() },
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
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payments</h3>
          <DataTable
            data={payments}
            isLoading={false}
            emptyMessage="No payments."
            getRowKey={(p) => p.id}
            columns={[
              { header: "Amount", render: (p) => formatCurrency(p.amount, p.currency) },
              { header: "Method", render: (p) => <PaymentMethodBadge method={p.paymentMethod} /> },
              { header: "Period", render: (p) => formatPeriod(p.periodStartDate, p.periodEndDate) },
              { header: "Date", render: (p) => new Date(p.createdAt).toLocaleDateString() },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}

export function FinancePage() {
  const role = useUserRole();
  const isOwnerOrAdmin = role === "owner" || role === "admin";
  // Recording payments and creating charges is a receptionist-only action —
  // owner/admin get read-only finance data (numbers and tables, no write
  // controls). The backend enforces the same split on POST /charges and
  // POST /payments, so this is UI convenience, not the security boundary.
  const canRecordPayments = role === "reception";

  const [sortBy, setSortBy] = useState<ChargesSortBy>("urgency");
  const [statusFilter, setStatusFilter] = useState<ChargeStatus | "">("");
  const [groupFilter, setGroupFilter] = useState("");
  const [search, setSearch] = useState("");
  // "2026-08" from <input type="month"> -> the period range that month spans.
  const [periodMonthFilter, setPeriodMonthFilter] = useState("");
  const periodFilter = useMemo(() => {
    if (!periodMonthFilter) return {};
    const [year, month] = periodMonthFilter.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    return { periodStart: toIso(start), periodEnd: toIso(end) };
  }, [periodMonthFilter]);

  const { data: accounts, isLoading: accountsLoading } = useFinancialAccounts();
  const { data: charges, isLoading: chargesLoading } = useCharges({
    sortBy,
    status: statusFilter || undefined,
    groupId: groupFilter || undefined,
  });
  const { data: summary } = usePaymentSummary();
  const { data: salaryAnalytics } = useSalaryAnalytics(isOwnerOrAdmin);
  const { data: salaries } = useSalaries(isOwnerOrAdmin);
  const { data: groups } = useGroups();
  const { data: payments, isLoading: paymentsLoading } = usePayments(periodFilter);
  const deleteCharge = useDeleteCharge();
  const deletePayment = useDeletePayment();
  const createPayment = useCreatePayment();
  const { showToast } = useToast();

  const [chargeFormOpen, setChargeFormOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [deletingCharge, setDeletingCharge] = useState<ChargeDto | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<PaymentDto | null>(null);
  const [markingPaid, setMarkingPaid] = useState<ChargeDto | null>(null);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  const filteredCharges = useMemo(() => {
    if (!search.trim()) return charges;
    const q = search.trim().toLowerCase();
    return charges?.filter((c) => (c.student?.name ?? "").toLowerCase().includes(q));
  }, [charges, search]);

  async function confirmDeleteCharge() {
    if (!deletingCharge) return;
    try {
      await deleteCharge.mutateAsync(deletingCharge.id);
      showToast("Charge deleted.");
      setDeletingCharge(null);
    } catch {
      showToast("Failed to delete charge.", "error");
    }
  }

  async function confirmDeletePayment() {
    if (!deletingPayment) return;
    try {
      await deletePayment.mutateAsync(deletingPayment.id);
      showToast("Payment deleted.");
      setDeletingPayment(null);
    } catch {
      showToast("Failed to delete payment.", "error");
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Finance</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Owed"
          value={summary ? formatCurrency(summary.totalAmountOwed, "UZS") : "-"}
          colorClass={summary && summary.totalAmountOwed > 0 ? "text-red-600" : "text-slate-900"}
          icon={<Wallet className="h-5 w-5 text-slate-400" />}
        />
        <SummaryCard
          label="Overdue Payments"
          value={summary ? String(summary.totalOverdue) : "-"}
          colorClass="text-red-600"
          icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
        />
        <SummaryCard
          label="Collected This Month"
          value={summary ? formatCurrency(summary.totalAmountCollected, "UZS") : "-"}
          colorClass="text-green-600"
          icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
        />
        <SummaryCard
          label="Pending Payments"
          value={summary ? String(summary.totalPending) : "-"}
          colorClass="text-yellow-600"
          icon={<Clock className="h-5 w-5 text-yellow-400" />}
        />
        {isOwnerOrAdmin && (
          <SummaryCard
            label="Salary Expense (This Month)"
            value={salaryAnalytics ? formatCurrency(salaryAnalytics.totalSalaryExpense, "UZS") : "-"}
            colorClass="text-red-600"
            icon={<HandCoins className="h-5 w-5 text-red-400" />}
          />
        )}
      </div>

      <ReminderStatsWidget />

      {isOwnerOrAdmin && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Account balances</h2>
          {accountsLoading && <p className="text-sm text-slate-500">Loading...</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts?.map((account) => (
              <div key={account.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{account.name}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(account.balance, "UZS")}
                </p>
                <p className="mt-1 text-xs capitalize text-slate-400 dark:text-slate-500">{account.type.replace("_", " ")}</p>
              </div>
            ))}
            {!accountsLoading && accounts?.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No financial accounts yet.</p>
            )}
          </div>
        </div>
      )}

      {isOwnerOrAdmin && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Teacher Salaries</h2>
            <Link to="/teachers/salaries" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View All
            </Link>
          </div>
          <DataTable
            data={salaries}
            isLoading={!salaries}
            emptyMessage="No teacher salaries configured yet."
            getRowKey={(s) => s.id}
            columns={[
              { header: "Teacher", render: (s) => s.teacherName },
              { header: "Salary", render: (s) => formatCurrency(s.amount, s.currency) },
              { header: "Status", render: (s) => <SalaryStatusBadge status={s.status} /> },
              { header: "Payment Status", render: (s) => <PaymentStatusBadge status={s.thisMonthPaymentStatus} /> },
            ]}
          />
        </div>
      )}

      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Charges</h2>
          {canRecordPayments && (
            <button
              onClick={() => setChargeFormOpen(true)}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New Charge
            </button>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="w-48">
            <TextField label="Search student" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name..." />
          </div>
          <div className="w-40">
            <SelectField label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ChargeStatus | "")}>
              <option value="">All</option>
              <option value="overdue">Overdue</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </SelectField>
          </div>
          <div className="w-48">
            <SelectField label="Group" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
              <option value="">All groups</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="w-40">
            <SelectField label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value as ChargesSortBy)}>
              <option value="urgency">Urgency</option>
              <option value="dueDate">Due Date</option>
              <option value="amount">Amount</option>
              <option value="name">Name</option>
            </SelectField>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Group/Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Days Left/Overdue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {chargesLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                      Loading...
                    </td>
                  </tr>
                )}
                {!chargesLoading && (!filteredCharges || filteredCharges.length === 0) && (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                      No charges match these filters.
                    </td>
                  </tr>
                )}
                {filteredCharges?.map((c, i) => {
                  const rowBg = c.isOverdue ? "bg-red-50 dark:bg-red-500/10" : c.status === "paid" ? "bg-green-50 dark:bg-green-500/10" : "";
                  return (
                    <tr key={c.id} className={rowBg}>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{i + 1}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${c.status === "paid" ? "text-slate-400 line-through" : "text-slate-900 dark:text-slate-100"}`}>
                        {c.student?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {c.group ? `${c.group.name}${c.group.courseName ? ` (${c.group.courseName})` : ""}` : "-"}
                      </td>
                      <td className={`px-4 py-3 text-sm ${c.status === "paid" ? "text-slate-400 line-through" : "text-slate-900 dark:text-slate-100"}`}>
                        {formatCurrency(c.amount, c.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{new Date(c.dueDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">
                        {c.isOverdue && c.daysOverdue != null && (
                          <span className="font-medium text-red-600">{c.daysOverdue} days overdue</span>
                        )}
                        {!c.isOverdue && c.daysUntilDue != null && (
                          <span className="font-medium text-green-600">{c.daysUntilDue} days left</span>
                        )}
                        {c.status === "paid" && <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            c.isOverdue ? CHARGE_STATUS_STYLES.overdue : CHARGE_STATUS_STYLES[c.status]
                          }`}
                        >
                          {c.isOverdue ? "overdue" : c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          {canRecordPayments && (c.status === "pending" || c.isOverdue) && (
                            <button
                              onClick={() => setMarkingPaid(c)}
                              className="rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => setHistoryStudentId(c.studentId)}
                            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View History
                          </button>
                          {isOwnerOrAdmin && (
                            <button
                              onClick={() => setDeletingCharge(c)}
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete charge"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Payments</h2>
          {canRecordPayments && (
            <button
              onClick={() => setPaymentFormOpen(true)}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New Payment
            </button>
          )}
        </div>
        <div className="mb-4 flex items-end gap-4">
          <div className="w-48">
            <TextField
              label="Filter by period"
              type="month"
              value={periodMonthFilter}
              onChange={(e) => setPeriodMonthFilter(e.target.value)}
            />
          </div>
          {periodMonthFilter && (
            <button
              onClick={() => setPeriodMonthFilter("")}
              className="mb-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>
        <DataTable
          data={payments}
          isLoading={paymentsLoading}
          emptyMessage="No payments yet."
          getRowKey={(p) => p.id}
          columns={[
            { header: "Student", render: (p) => p.student?.name ?? "-" },
            { header: "Amount", render: (p) => formatCurrency(p.amount, p.currency) },
            { header: "Method", render: (p) => <PaymentMethodBadge method={p.paymentMethod} /> },
            { header: "Period", render: (p) => formatPeriod(p.periodStartDate, p.periodEndDate) },
            { header: "Date", render: (p) => new Date(p.createdAt).toLocaleDateString() },
          ]}
          renderActions={
            isOwnerOrAdmin
              ? (p) => (
                  <button
                    onClick={() => setDeletingPayment(p)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete payment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )
              : undefined
          }
        />
      </div>

      <ChargeForm open={chargeFormOpen} onClose={() => setChargeFormOpen(false)} />
      <PaymentForm open={paymentFormOpen} onClose={() => setPaymentFormOpen(false)} />
      <StudentHistoryModal studentId={historyStudentId} onClose={() => setHistoryStudentId(null)} />

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
        open={Boolean(deletingCharge)}
        title="Delete charge"
        message="Are you sure you want to delete this charge? This cannot be undone."
        isConfirming={deleteCharge.isPending}
        onConfirm={confirmDeleteCharge}
        onCancel={() => setDeletingCharge(null)}
      />
      <ConfirmDialog
        open={Boolean(deletingPayment)}
        title="Delete payment"
        message="Are you sure you want to delete this payment? This cannot be undone."
        isConfirming={deletePayment.isPending}
        onConfirm={confirmDeletePayment}
        onCancel={() => setDeletingPayment(null)}
      />
    </div>
  );
}
