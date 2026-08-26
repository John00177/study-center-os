import { AxiosError } from "axios";
import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import type { StaffRole } from "@crm/shared-types";
import { Modal } from "../../components/Modal";
import { TextField, SelectField } from "../../components/form/Field";
import { TempPasswordReveal } from "../../components/auth/TempPasswordReveal";
import { useToast } from "../../components/Toast";
import { useTranslation } from "../../hooks/use-translation";
import { useCreateStaffMember } from "../../hooks/use-staff";

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "reception", label: "Receptionist" },
  { value: "teacher", label: "Teacher" },
  { value: "manager", label: "Manager" },
];

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && typeof err.response?.data?.message === "string") {
    return err.response.data.message;
  }
  return fallback;
}

const EMPTY_FORM = { name: "", role: "reception" as StaffRole, phone: "" };

export function AddStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const createStaff = useCreateStaffMember();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  function reset() {
    setForm(EMPTY_FORM);
    setErrors({});
    setResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: t("Full Name") + " " + t("is required.") });
      return;
    }
    setErrors({});

    try {
      const created = await createStaff.mutateAsync({
        name: form.name.trim(),
        role: form.role,
        phone: form.phone.trim() || undefined,
      });
      setResult({ email: created.user.email, tempPassword: created.tempPassword });
    } catch (err) {
      showToast(errorMessage(err, t("Failed to create staff member.")), "error");
    }
  }

  if (result) {
    return (
      <Modal open={open} onClose={handleClose} title={t("Staff member created")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("Email")}</label>
            <code className="block rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              {result.email}
            </code>
          </div>
          <TempPasswordReveal
            label={t("Temporary password")}
            password={result.tempPassword}
            onDone={() => {
              showToast(t("Staff member created."));
              handleClose();
            }}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("Add Staff Member")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t("Full Name")}
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <SelectField label={t("Role")} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.label)}
            </option>
          ))}
        </SelectField>
        <TextField
          label={t("Phone")}
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("A secure temporary password is generated automatically.")}
        </p>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={createStaff.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={createStaff.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {createStaff.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
