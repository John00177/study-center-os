import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { SalaryPaymentMethod, TeacherSalaryLineDto } from "@crm/shared-types";
import { Loader2 } from "lucide-react";
import { Modal } from "../Modal";
import { SelectField, TextField } from "../form/Field";
import { useToast } from "../Toast";
import { useRecordSalaryPayment } from "../../hooks/use-salary";
import { useTranslation } from "../../hooks/use-translation";

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  salary: TeacherSalaryLineDto | null;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function lastNMonths(n: number): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ value, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) });
  }
  return months;
}

export function RecordPaymentModal({ open, onClose, salary }: RecordPaymentModalProps) {
  const { t } = useTranslation();
  const recordPayment = useRecordSalaryPayment(salary?.id ?? "");
  const { showToast } = useToast();
  const months = useMemo(() => lastNMonths(4), []);

  const [month, setMonth] = useState(currentMonth());
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<SalaryPaymentMethod>("cash");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !salary) return;
    setMonth(currentMonth());
    setAmount(String(salary.amount));
    setPaymentMethod("cash");
    setPaidAt(new Date().toISOString().slice(0, 10));
    setNotes("");
    setErrors({});
  }, [open, salary]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!salary) return;
    const nextErrors: Record<string, string> = {};
    if (!amount || Number(amount) < 0) nextErrors.amount = "Enter a valid amount.";
    if (!paidAt) nextErrors.paidAt = "Select a paid date.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      await recordPayment.mutateAsync({
        month,
        amount: Number(amount),
        paymentMethod,
        paidAt,
        notes: notes.trim() || undefined,
      });
      showToast(t("Payment recorded."));
      onClose();
    } catch {
      showToast(t("Failed to record payment."), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Record Payment${salary ? ` — ${salary.teacherName}` : ""}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField label={t("Month")} value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </SelectField>

        <TextField
          label={t("Amount (UZS)")}
          type="number"
          min="0"
          required
          value={amount}
          error={errors.amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <SelectField
          label={t("Payment Method")}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as SalaryPaymentMethod)}
        >
          <option value="cash">{t("Cash")}</option>
          <option value="bank_transfer">{t("Bank transfer")}</option>
          <option value="card">{t("Card")}</option>
        </SelectField>

        <TextField
          label={t("Paid Date")}
          type="date"
          required
          value={paidAt}
          error={errors.paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t("Notes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("Optional notes...")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={recordPayment.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={recordPayment.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {recordPayment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
