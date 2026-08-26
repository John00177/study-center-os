import { useState } from "react";
import { Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { StaffMemberDto } from "@crm/shared-types";
import { useNavigate } from "react-router-dom";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { TextField } from "../../components/form/Field";
import { TempPasswordReveal } from "../../components/auth/TempPasswordReveal";
import { useToast } from "../../components/Toast";
import { useTranslation } from "../../hooks/use-translation";
import {
  useActivateStaffMember,
  useDeleteStaffMember,
  useResetStaffPassword,
  useStaffList,
  useSuspendStaffMember,
  useUpdateStaffMember,
} from "../../hooks/use-staff";
import { AddStaffModal } from "./AddStaffModal";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  invited: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

// Owner is never shown in this table (createStaffMember can't create one,
// deleteStaffMember refuses to remove one) — these badges cover the three
// roles the "Add Staff Member" flow actually produces.
const ROLE_BADGE_STYLES: Record<string, string> = {
  reception: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  teacher: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
};

function EditStaffModal({ member, onClose }: { member: StaffMemberDto | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const update = useUpdateStaffMember();
  const [name, setName] = useState(member?.name ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");

  async function handleSubmit() {
    if (!member) return;
    try {
      await update.mutateAsync({ userId: member.userId, name: name.trim() || undefined, phone: phone.trim() });
      showToast(t("Staff member updated."));
      onClose();
    } catch {
      showToast(t("Failed to update staff member."), "error");
    }
  }

  return (
    <Modal open={Boolean(member)} onClose={onClose} title={t("Edit staff member")}>
      {member && (
        <div className="space-y-4">
          <TextField label={t("Full Name")} defaultValue={member.name} onChange={(e) => setName(e.target.value)} />
          <TextField label={t("Phone")} defaultValue={member.phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50"
            >
              {t("Cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={update.isPending}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Save changes")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function StaffActions({
  member,
  onResetPassword,
  onEdit,
  onDelete,
}: {
  member: StaffMemberDto;
  onResetPassword: (member: StaffMemberDto) => void;
  onEdit: (member: StaffMemberDto) => void;
  onDelete: (member: StaffMemberDto) => void;
}) {
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
        onClick={() => onEdit(member)}
        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        aria-label={t("Edit")}
        title={t("Edit")}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={() => onResetPassword(member)}
        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        aria-label={t("Reset password")}
        title={t("Reset password")}
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        onClick={toggleStatus}
        disabled={isPending}
        className="rounded p-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-60"
      >
        {isPending && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
        {member.status === "suspended" ? t("Activate") : t("Suspend")}
      </button>
      {member.roleSlug === "teacher" && (
        <button
          onClick={() => navigate("/teachers")}
          className="rounded p-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
        >
          {t("Manage Access")}
        </button>
      )}
      <button
        onClick={() => onDelete(member)}
        className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
        aria-label={t("Delete")}
        title={t("Delete")}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StaffMembersPage() {
  const { t } = useTranslation();
  const { data: staff, isLoading } = useStaffList();
  const resetPassword = useResetStaffPassword();
  const deleteStaff = useDeleteStaffMember();
  const { showToast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMemberDto | null>(null);
  const [deleting, setDeleting] = useState<StaffMemberDto | null>(null);
  const [resettingFor, setResettingFor] = useState<StaffMemberDto | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const staffOnly = (staff ?? []).filter((m) => m.roleSlug !== "owner");

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

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteStaff.mutateAsync(deleting.userId);
      showToast(`${deleting.name} removed.`);
      setDeleting(null);
    } catch {
      showToast(t("Failed to remove staff member."), "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("Staff Members")}</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {t("Add Staff Member")}
        </button>
      </div>

      <DataTable
        data={staffOnly}
        isLoading={isLoading}
        emptyMessage={t("No staff members yet.")}
        getRowKey={(m) => m.userId}
        columns={[
          { header: t("Name"), render: (m) => <span className="font-medium text-slate-900 dark:text-slate-100">{m.name}</span> },
          {
            header: t("Role"),
            render: (m) => (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_STYLES[m.roleSlug] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
              >
                {m.roleSlug === "admin" ? t("Manager") : m.roleName}
              </span>
            ),
          },
          { header: t("Email"), render: (m) => <span className="text-slate-600 dark:text-slate-300">{m.email}</span> },
          { header: t("Phone"), render: (m) => m.phone ?? "—" },
          {
            header: t("Status"),
            render: (m) => (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[m.status]}`}>
                {t(m.status)}
              </span>
            ),
          },
        ]}
        renderActions={(m) => (
          <StaffActions member={m} onResetPassword={setResettingFor} onEdit={setEditing} onDelete={setDeleting} />
        )}
      />

      <AddStaffModal open={addOpen} onClose={() => setAddOpen(false)} />
      <EditStaffModal key={editing?.userId ?? "none"} member={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("Remove staff member")}
        message={`Remove ${deleting?.name} from your organization? They will no longer be able to sign in.`}
        confirmLabel={deleteStaff.isPending ? "Removing..." : "Remove"}
        isConfirming={deleteStaff.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

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
