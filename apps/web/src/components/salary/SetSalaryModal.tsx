import { useEffect, useState, type FormEvent } from "react";
import type { SalaryType, TeacherSalaryLineDto } from "@crm/shared-types";
import { Loader2 } from "lucide-react";
import { Modal } from "../Modal";
import { SelectField, TextField } from "../form/Field";
import { useToast } from "../Toast";
import { useTeachers } from "../../hooks/use-teachers";
import { useSetSalary } from "../../hooks/use-salary";
import { useTranslation } from "../../hooks/use-translation";

interface SetSalaryModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fills the form for "Edit Salary" on an existing line; null starts a blank "Set Salary" form. */
  editing: TeacherSalaryLineDto | null;
}

const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  fixed: "Fixed Monthly",
  hourly: "Hourly",
  per_student: "Per Student",
};

export function SetSalaryModal({ open, onClose, editing }: SetSalaryModalProps) {
  const { t } = useTranslation();
  const { data: teachers } = useTeachers();
  const setSalary = useSetSalary();
  const { showToast } = useToast();

  const [teacherId, setTeacherId] = useState("");
  const [type, setType] = useState<SalaryType>("fixed");
  const [amount, setAmount] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [perStudentRate, setPerStudentRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setTeacherId(editing?.teacherId ?? "");
    setType(editing?.type ?? "fixed");
    setAmount(editing ? String(editing.amount) : "");
    setHourlyRate(editing?.hourlyRate != null ? String(editing.hourlyRate) : "");
    setPerStudentRate(editing?.perStudentRate != null ? String(editing.perStudentRate) : "");
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setNotes(editing?.notes ?? "");
    setErrors({});
  }, [open, editing]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!teacherId) nextErrors.teacherId = "Select a teacher.";
    if (!amount || Number(amount) < 0) nextErrors.amount = "Enter a valid amount.";
    if (type === "hourly" && (!hourlyRate || Number(hourlyRate) < 0)) nextErrors.hourlyRate = "Enter an hourly rate.";
    if (type === "per_student" && (!perStudentRate || Number(perStudentRate) < 0)) {
      nextErrors.perStudentRate = "Enter a per-student rate.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      await setSalary.mutateAsync({
        teacherId,
        type,
        amount: Number(amount),
        hourlyRate: type === "hourly" ? Number(hourlyRate) : undefined,
        perStudentRate: type === "per_student" ? Number(perStudentRate) : undefined,
        effectiveFrom: effectiveFrom || undefined,
        notes: notes.trim() || undefined,
      });
      showToast(editing ? "Salary updated." : "Salary set.");
      onClose();
    } catch {
      showToast(t("Failed to save salary."), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Salary" : "Set Salary"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label={t("Teacher")}
          required
          value={teacherId}
          error={errors.teacherId}
          disabled={Boolean(editing)}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          <option value="">{t("Select teacher")}</option>
          {teachers?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectField>

        <SelectField label={t("Salary Type")} value={type} onChange={(e) => setType(e.target.value as SalaryType)}>
          {Object.entries(SALARY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>

        {type === "fixed" && (
          <TextField
            label={t("Monthly Amount (UZS)")}
            type="number"
            min="0"
            required
            value={amount}
            error={errors.amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        )}

        {type === "hourly" && (
          <>
            <TextField
              label={t("Hourly Rate (UZS)")}
              type="number"
              min="0"
              required
              value={hourlyRate}
              error={errors.hourlyRate}
              onChange={(e) => {
                setHourlyRate(e.target.value);
                setAmount(e.target.value);
              }}
            />
            <p className="text-xs text-slate-500">
              {t("Estimated monthly amount is calculated from the teacher's actual weekly schedule once saved.")}
            </p>
          </>
        )}

        {type === "per_student" && (
          <>
            <TextField
              label={t("Per Student Rate (UZS)")}
              type="number"
              min="0"
              required
              value={perStudentRate}
              error={errors.perStudentRate}
              onChange={(e) => {
                setPerStudentRate(e.target.value);
                setAmount(e.target.value);
              }}
            />
            <p className="text-xs text-slate-500">
              {t("Estimated monthly amount is calculated from the teacher's actual enrolled students once saved.")}
            </p>
          </>
        )}

        <TextField
          label={t("Effective From")}
          type="date"
          required
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
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
            disabled={setSalary.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={setSalary.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {setSalary.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
