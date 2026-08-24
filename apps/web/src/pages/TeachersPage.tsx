import type { TeacherDto } from "@crm/shared-types";
import { Eye, Loader2, Pencil, Plus, Power, PowerOff, RotateCcw, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { TextField } from "../components/form/Field";
import { SubscriptionLimitBanners } from "../components/subscription/SubscriptionLimitBanners";
import { TempPasswordReveal } from "../components/auth/TempPasswordReveal";
import { errorMessage } from "../lib/plan-lock";
import { useGroups } from "../hooks/use-groups";
import {
  CreateTeacherInput,
  TeacherInput,
  useActivateTeacherDashboard,
  useCreateTeacher,
  useDeleteTeacher,
  useResetTeacherPassword,
  useSuspendTeacherDashboard,
  useTeacherTempPassword,
  useTeachers,
  useUpdateTeacher,
} from "../hooks/use-teachers";

interface FormState {
  name: string;
  email: string;
  phone: string;
  specialization: string;
}

function toFormState(teacher?: TeacherDto | null): FormState {
  return {
    name: teacher?.name ?? "",
    email: teacher?.email ?? "",
    phone: teacher?.phone ?? "",
    specialization: teacher?.specialization ?? "",
  };
}

function EditTeacherModal({ open, onClose, teacher }: { open: boolean; onClose: () => void; teacher: TeacherDto | null }) {
  const [form, setForm] = useState<FormState>(() => toFormState(teacher));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const updateTeacher = useUpdateTeacher();
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      setForm(toFormState(teacher));
      setErrors({});
    }
  }, [open, teacher]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!teacher) return;
    if (!form.name.trim()) {
      setErrors({ name: "Name is required." });
      return;
    }

    const input: TeacherInput = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      specialization: form.specialization.trim() || undefined,
    };

    try {
      await updateTeacher.mutateAsync({ id: teacher.id, ...input });
      showToast("Teacher updated.");
      onClose();
    } catch (err) {
      showToast(errorMessage(err, "Failed to update teacher."), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Teacher">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Name"
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <TextField
          label="Specialization"
          value={form.specialization}
          onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
        />

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={updateTeacher.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateTeacher.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {updateTeacher.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

const EMPTY_ADD_FORM = { name: "", email: "", phone: "", specialization: "", groupIds: new Set<string>() };

function AddTeacherModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: groups } = useGroups();
  const createTeacher = useCreateTeacher();
  const { showToast } = useToast();

  const [form, setForm] = useState(EMPTY_ADD_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_ADD_FORM);
      setErrors({});
      setTempPassword(null);
    }
  }, [open]);

  function toggleGroup(groupId: string) {
    setForm((f) => {
      const next = new Set(f.groupIds);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return { ...f, groupIds: next };
    });
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

    const input: CreateTeacherInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      specialization: form.specialization.trim() || undefined,
      groupIds: form.groupIds.size ? [...form.groupIds] : undefined,
    };

    try {
      const result = await createTeacher.mutateAsync(input);
      setTempPassword(result.tempPassword);
    } catch (err) {
      showToast(errorMessage(err, "Failed to create teacher."), "error");
    }
  }

  if (tempPassword) {
    return (
      <Modal open={open} onClose={onClose} title="Teacher Created">
        <TempPasswordReveal
          label="Temporary password"
          password={tempPassword}
          onDone={() => {
            showToast(`Teacher created! Temporary password: ${tempPassword}`);
            onClose();
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Teacher">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Full Name"
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Email"
            type="email"
            required
            value={form.email}
            error={errors.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label="Phone"
            required
            value={form.phone}
            error={errors.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <TextField
          label="Specialization"
          value={form.specialization}
          onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Assign to Groups</label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-300 p-2">
            {groups?.length ? (
              groups.map((g) => (
                <label key={g.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.groupIds.has(g.id)}
                    onChange={() => toggleGroup(g.id)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  {g.name}
                </label>
              ))
            ) : (
              <p className="px-2 py-1 text-sm text-slate-400">No groups yet.</p>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500">A secure temporary password is generated automatically.</p>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createTeacher.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createTeacher.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {createTeacher.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Teacher
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ViewTempPasswordModal({ teacherId, onClose }: { teacherId: string | null; onClose: () => void }) {
  const { data, isLoading } = useTeacherTempPassword(teacherId);

  return (
    <Modal open={Boolean(teacherId)} onClose={onClose} title="Temporary Password">
      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {!isLoading && data && (
        data.tempPassword ? (
          <TempPasswordReveal label="Temporary password" password={data.tempPassword} onDone={onClose} />
        ) : (
          <p className="text-sm text-slate-500">This teacher has already changed their password.</p>
        )
      )}
    </Modal>
  );
}

function DashboardStatusBadge({ status }: { status: TeacherDto["dashboardStatus"] }) {
  const styles: Record<TeacherDto["dashboardStatus"], string> = {
    not_activated: "bg-slate-100 text-slate-600",
    active: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function PasswordStatusBadge({ mustChangePassword }: { mustChangePassword: boolean }) {
  return mustChangePassword ? (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
      Password Not Changed
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      Active
    </span>
  );
}

export function TeachersPage() {
  const { data, isLoading } = useTeachers();
  const deleteTeacher = useDeleteTeacher();
  const activateDashboard = useActivateTeacherDashboard();
  const suspendDashboard = useSuspendTeacherDashboard();
  const resetPassword = useResetTeacherPassword();
  const { showToast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherDto | null>(null);
  const [deleting, setDeleting] = useState<TeacherDto | null>(null);
  const [viewingPasswordFor, setViewingPasswordFor] = useState<string | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<TeacherDto | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteTeacher.mutateAsync(deleting.id);
      showToast("Teacher deleted.");
      setDeleting(null);
    } catch {
      showToast("Failed to delete teacher.", "error");
    }
  }

  async function toggleDashboardAccess(teacher: TeacherDto) {
    try {
      if (teacher.dashboardStatus === "active") {
        await suspendDashboard.mutateAsync(teacher.id);
        showToast("Dashboard access suspended.");
      } else {
        await activateDashboard.mutateAsync(teacher.id);
        showToast("Dashboard access activated.");
      }
    } catch (err) {
      showToast(errorMessage(err, "Failed to update dashboard access."), "error");
    }
  }

  async function confirmResetPassword() {
    if (!resettingPasswordFor) return;
    try {
      const result = await resetPassword.mutateAsync(resettingPasswordFor.id);
      setResettingPasswordFor(null);
      setResetResult(result.tempPassword);
    } catch {
      showToast("Failed to reset password.", "error");
    }
  }

  return (
    <div>
      <SubscriptionLimitBanners resource="teacher" />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Teachers</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Teacher
        </button>
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        emptyMessage='No teachers yet. Click "Add Teacher" to add one.'
        getRowKey={(t) => t.id}
        columns={[
          { header: "Name", render: (t) => <span className="font-medium text-slate-900">{t.name}</span> },
          { header: "Specialization", render: (t) => t.specialization ?? "-" },
          { header: "Groups", render: (t) => t.activeGroupCount, align: "right" },
          { header: "Dashboard", render: (t) => <DashboardStatusBadge status={t.dashboardStatus} /> },
          { header: "Status", render: (t) => <PasswordStatusBadge mustChangePassword={t.mustChangePassword} /> },
        ]}
        renderActions={(t) => (
          <>
            {t.mustChangePassword && (
              <button
                onClick={() => setViewingPasswordFor(t.id)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="View temporary password"
                title="View temporary password"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setResettingPasswordFor(t)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Reset password"
              title="Reset password"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleDashboardAccess(t)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={t.dashboardStatus === "active" ? "Suspend dashboard access" : "Activate dashboard access"}
              title={t.dashboardStatus === "active" ? "Suspend dashboard access" : "Activate dashboard access"}
            >
              {t.dashboardStatus === "active" ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setEditing(t)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Edit teacher"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleting(t)}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete teacher"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <AddTeacherModal open={addOpen} onClose={() => setAddOpen(false)} />
      <EditTeacherModal open={Boolean(editing)} onClose={() => setEditing(null)} teacher={editing} />
      <ViewTempPasswordModal teacherId={viewingPasswordFor} onClose={() => setViewingPasswordFor(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete teacher"
        message={`Are you sure you want to delete ${deleting?.name}? This cannot be undone.`}
        isConfirming={deleteTeacher.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={Boolean(resettingPasswordFor)}
        title="Reset password"
        message={`Generate a new temporary password for ${resettingPasswordFor?.name}? They will need to set a new password on next login.`}
        confirmLabel={resetPassword.isPending ? "Resetting..." : "Reset Password"}
        isConfirming={resetPassword.isPending}
        onConfirm={confirmResetPassword}
        onCancel={() => setResettingPasswordFor(null)}
      />

      <Modal open={Boolean(resetResult)} onClose={() => setResetResult(null)} title="Password Reset">
        {resetResult && (
          <TempPasswordReveal label="New temporary password" password={resetResult} onDone={() => setResetResult(null)} />
        )}
      </Modal>
    </div>
  );
}
