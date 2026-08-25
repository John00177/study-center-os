import type { StaffMemberDto } from "@crm/shared-types";
import { AxiosError } from "axios";
import { FormEvent, useState } from "react";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "../DataTable";
import { Modal } from "../Modal";
import { ConfirmDialog } from "../ConfirmDialog";
import { useToast } from "../Toast";
import { TextField } from "../form/Field";
import { TempPasswordReveal } from "../auth/TempPasswordReveal";
import { useTranslation } from "../../hooks/use-translation";
import {
  useActivateStaffMember,
  useCreateReceptionist,
  useResetStaffPassword,
  useStaffList,
  useSuspendStaffMember,
} from "../../hooks/use-staff";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  invited: "bg-slate-100 text-slate-600",
  suspended: "bg-red-100 text-red-700",
};

const DASHBOARD_ACCESS_LABEL: Record<string, string> = {
  active: "Active",
  not_activated: "Not Activated",
  suspended: "Suspended",
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && typeof err.response?.data?.message === "string") {
    return err.response.data.message;
  }
  return fallback;
}

const EMPTY_FORM = { name: "", email: "", phone: "" };

function AddReceptionistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const createReceptionist = useCreateReceptionist();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function reset() {
    setForm(EMPTY_FORM);
    setErrors({});
    setTempPassword(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.phone.trim()) nextErrors.phone = "Phone is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      const result = await createReceptionist.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setTempPassword(result.tempPassword);
    } catch (err) {
      showToast(errorMessage(err, "Failed to create receptionist."), "error");
    }
  }

  if (tempPassword) {
    return (
      <Modal
        open={open}
        onClose={() => {
          reset();
          onClose();
        }}
        title={t("Receptionist Created")}
      >
        <TempPasswordReveal
          label={t("Temporary password")}
          password={tempPassword}
          onDone={() => {
            showToast(`Receptionist created! Temporary password: ${tempPassword}`);
            reset();
            onClose();
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("Add New Receptionist")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t("Full Name")}
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <TextField
          label={t("Email")}
          type="email"
          required
          value={form.email}
          error={errors.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <TextField
          label={t("Phone")}
          required
          value={form.phone}
          error={errors.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />

        <p className="text-xs text-slate-500">{t("A secure temporary password is generated automatically.")}</p>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createReceptionist.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={createReceptionist.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {createReceptionist.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Create Receptionist")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StaffActions({ member, onResetPassword }: { member: StaffMemberDto; onResetPassword: (member: StaffMemberDto) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const suspend = useSuspendStaffMember();
  const activate = useActivateStaffMember();
  const { showToast } = useToast();
  const isPending = suspend.isPending || activate.isPending;

  async function toggleStatus() {
    try {
      if (member.status === "suspended") {
        await activate.mutateAsync(member.userId);
        showToast(`${member.name} activated.`);
      } else {
        await suspend.mutateAsync(member.userId);
        showToast(`${member.name} suspended.`);
      }
    } catch {
      showToast(t("Failed to update staff status."), "error");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onResetPassword(member)}
        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label={t("Reset password")}
        title={t("Reset password")}
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        onClick={toggleStatus}
        disabled={isPending}
        className="rounded p-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 disabled:opacity-60"
      >
        {isPending && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
        {member.status === "suspended" ? "Activate" : "Suspend"}
      </button>
      {member.roleSlug === "teacher" && (
        <button
          onClick={() => navigate("/teachers")}
          className="rounded p-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
        >
          {t("Manage Access")}
        </button>
      )}
    </div>
  );
}

export function StaffSection() {
  const { t } = useTranslation();
  const { data: staff, isLoading } = useStaffList();
  const resetPassword = useResetStaffPassword();
  const { showToast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [resettingFor, setResettingFor] = useState<StaffMemberDto | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);

  async function confirmResetPassword() {
    if (!resettingFor) return;
    try {
      const result = await resetPassword.mutateAsync(resettingFor.userId);
      setResettingFor(null);
      setResetResult(result.tempPassword);
    } catch {
      showToast(t("Failed to reset password."), "error");
    }
  }

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("Staff Members")} ({staff?.length ?? 0})
        </h2>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {t("Add Receptionist")}
        </button>
      </div>
      <DataTable
        data={staff}
        isLoading={isLoading}
        emptyMessage={t("No staff members yet.")}
        getRowKey={(m) => m.userId}
        columns={[
          { header: t("Name"), render: (m) => <span className="font-medium text-slate-900 dark:text-slate-100">{m.name}</span> },
          { header: t("Role"), render: (m) => <span className="capitalize">{m.roleName}</span> },
          { header: t("Branch"), render: (m) => m.branchName ?? "—" },
          {
            header: t("Status"),
            render: (m) => (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[m.status]}`}>
                {m.status}
              </span>
            ),
          },
          {
            header: t("Password"),
            render: (m) =>
              m.mustChangePassword ? (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                  {t("Not Changed")}
                </span>
              ) : (
                <span className="text-xs text-slate-400">{t("Changed")}</span>
              ),
          },
          {
            header: t("Dashboard Access"),
            render: (m) => (m.dashboardAccessStatus ? DASHBOARD_ACCESS_LABEL[m.dashboardAccessStatus] : "—"),
          },
        ]}
        renderActions={(m) => <StaffActions member={m} onResetPassword={setResettingFor} />}
      />

      <AddReceptionistModal open={addOpen} onClose={() => setAddOpen(false)} />

      <ConfirmDialog
        open={Boolean(resettingFor)}
        title={t("Reset password")}
        message={`Generate a new temporary password for ${resettingFor?.name}? They will need to set a new password on next login.`}
        confirmLabel={resetPassword.isPending ? "Resetting..." : "Reset Password"}
        isConfirming={resetPassword.isPending}
        onConfirm={confirmResetPassword}
        onCancel={() => setResettingFor(null)}
      />

      <Modal open={Boolean(resetResult)} onClose={() => setResetResult(null)} title={t("Password Reset")}>
        {resetResult && (
          <TempPasswordReveal label={t("New temporary password")} password={resetResult} onDone={() => setResetResult(null)} />
        )}
      </Modal>
    </div>
  );
}
