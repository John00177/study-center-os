import type { StudentDto } from "@crm/shared-types";
import { Bell, CalendarClock, Eye, Loader2, Pencil, Plus, RotateCcw, UserPlus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { SelectField, TextField } from "../components/form/Field";
import { StudentAttendanceHistoryModal } from "../components/attendance/StudentAttendanceHistoryModal";
import { StudentRemindersModal } from "../components/reminders/StudentRemindersModal";
import { SubscriptionLimitBanners } from "../components/subscription/SubscriptionLimitBanners";
import { TempPasswordReveal } from "../components/auth/TempPasswordReveal";
import { errorMessage } from "../lib/plan-lock";
import { useGroups } from "../hooks/use-groups";
import { useUserRole } from "../stores/auth.store";
import { useTranslation } from "../hooks/use-translation";
import {
  StudentInput,
  useCreateStudent,
  useCreateStudentDirect,
  useDeleteStudent,
  useLinkParent,
  useResetStudentPassword,
  useStudentTempPassword,
  useStudents,
  useUpdateStudent,
} from "../hooks/use-students";

interface FormState {
  name: string;
  socialAccount: string;
  phone: string;
  address: string;
  emergencyContact: string;
  gender: string;
  dateOfBirth: string;
  parentPhone: string;
  medicalCard: boolean;
  notes: string;
}

function toFormState(student?: StudentDto | null): FormState {
  return {
    name: student?.name ?? "",
    socialAccount: student?.socialAccount ?? "",
    phone: student?.phone ?? "",
    address: student?.address ?? "",
    emergencyContact: student?.emergencyContact ?? "",
    gender: student?.gender ?? "",
    dateOfBirth: student?.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "",
    parentPhone: student?.parentPhone ?? "",
    medicalCard: student?.medicalCard ?? false,
    notes: student?.notes ?? "",
  };
}

// Exported so StudentProfilePage's header "Edit" button can reuse this same
// modal instead of duplicating the form.
export function StudentForm({
  open,
  onClose,
  student,
}: {
  open: boolean;
  onClose: () => void;
  student?: StudentDto | null;
}) {
  const { t } = useTranslation();
  const isEditing = Boolean(student);
  const [form, setForm] = useState<FormState>(() => toFormState(student));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const { showToast } = useToast();
  const isSaving = createStudent.isPending || updateStudent.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(student));
      setErrors({});
    }
  }, [open, student]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.gender) nextErrors.gender = "Gender is required.";
    if (!form.dateOfBirth) nextErrors.dateOfBirth = "Birth date is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const input: StudentInput = {
      name: form.name.trim(),
      socialAccount: form.socialAccount.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      parentPhone: form.parentPhone.trim() || undefined,
      medicalCard: form.medicalCard,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (isEditing && student) {
        await updateStudent.mutateAsync({ id: student.id, ...input });
        showToast(t("Student updated."));
      } else {
        await createStudent.mutateAsync(input);
        showToast(t("Student created."));
      }
      onClose();
    } catch (err) {
      showToast(errorMessage(err, isEditing ? "Failed to update student." : "Failed to create student."), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Student" : "New Student"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t("Name")}
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label={t("Social Account")}
            placeholder={t("Telegram/WhatsApp")}
            value={form.socialAccount}
            onChange={(e) => setForm((f) => ({ ...f, socialAccount: e.target.value }))}
          />
          <TextField
            label={t("Phone")}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <TextField
          label={t("Address")}
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label={t("Gender")}
            required
            value={form.gender}
            error={errors.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
          >
            <option value="">{t("Select gender")}</option>
            <option value="male">{t("Male")}</option>
            <option value="female">{t("Female")}</option>
          </SelectField>
          <TextField
            label={t("Birth Date")}
            type="date"
            required
            value={form.dateOfBirth}
            error={errors.dateOfBirth}
            onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
          />
        </div>

        <TextField
          label={t("Parent Phone")}
          value={form.parentPhone}
          onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.medicalCard}
            onChange={(e) => setForm((f) => ({ ...f, medicalCard: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          {t("Has medical card")}
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t("Note")}</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save changes" : "Create student"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const EMPTY_DIRECT_FORM = {
  name: "",
  phone: "",
  email: "",
  groupId: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
};

function AddStudentDirectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: groups } = useGroups();
  const createStudentDirect = useCreateStudentDirect();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_DIRECT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function reset() {
    setForm(EMPTY_DIRECT_FORM);
    setErrors({});
    setTempPassword(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required.";
    if (!form.phone.trim()) nextErrors.phone = "Phone is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      const result = await createStudentDirect.mutateAsync({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        groupId: form.groupId || undefined,
        parentName: form.parentName.trim() || undefined,
        parentEmail: form.parentEmail.trim() || undefined,
        parentPhone: form.parentPhone.trim() || undefined,
      });
      setTempPassword(result.tempPassword);
    } catch (err) {
      showToast(errorMessage(err, "Failed to create student."), "error");
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
        title={t("Student Created")}
      >
        <TempPasswordReveal
          label={t("Temporary password")}
          password={tempPassword}
          onDone={() => {
            showToast(`Student created! Temporary password: ${tempPassword}`);
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
      title={t("Add New Student")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t("Full Name")}
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label={t("Phone")}
            required
            value={form.phone}
            error={errors.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <TextField
            label={t("Email")}
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <SelectField label={t("Group")} value={form.groupId} onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}>
          <option value="">{t("Not assigned yet")}</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </SelectField>

        <div className="border-t border-slate-200 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Parent (optional)")}</p>
          <div className="space-y-4">
            <TextField
              label={t("Parent Name")}
              value={form.parentName}
              onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label={t("Parent Email")}
                type="email"
                value={form.parentEmail}
                onChange={(e) => setForm((f) => ({ ...f, parentEmail: e.target.value }))}
              />
              <TextField
                label={t("Parent Phone")}
                value={form.parentPhone}
                onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">{t("A secure temporary password is generated automatically.")}</p>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createStudentDirect.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={createStudentDirect.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {createStudentDirect.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Create Student")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LinkParentModal({ student, onClose }: { student: StudentDto | null; onClose: () => void }) {
  const { t } = useTranslation();
  const linkParent = useLinkParent(student?.id ?? "");
  const { showToast } = useToast();
  const [form, setForm] = useState({ parentName: "", parentEmail: "", parentPhone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setForm({
        parentName: student.parentName ?? "",
        parentEmail: student.parentEmail ?? "",
        parentPhone: student.parentPhone ?? "",
      });
      setErrors({});
      setTempPassword(null);
    }
  }, [student]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.parentName.trim()) nextErrors.parentName = "Parent name is required.";
    if (!form.parentEmail.trim()) nextErrors.parentEmail = "Parent email is required.";
    if (!form.parentPhone.trim()) nextErrors.parentPhone = "Parent phone is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      const result = await linkParent.mutateAsync({
        parentName: form.parentName.trim(),
        parentEmail: form.parentEmail.trim(),
        parentPhone: form.parentPhone.trim(),
      });
      setTempPassword(result.tempPassword);
    } catch (err) {
      showToast(errorMessage(err, "Failed to link parent."), "error");
    }
  }

  if (tempPassword) {
    return (
      <Modal open={Boolean(student)} onClose={onClose} title={t("Parent Linked")}>
        <p className="mb-4 text-sm text-slate-600">
          {t("Parent can log in at")}<span className="font-medium text-slate-900 dark:text-slate-100">/parent/login</span> with their email or
          phone and the password below.
        </p>
        <TempPasswordReveal label={t("Parent temporary password")} password={tempPassword} onDone={onClose} />
      </Modal>
    );
  }

  return (
    <Modal open={Boolean(student)} onClose={onClose} title={`Link Parent — ${student?.name ?? ""}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t("Parent Name")}
          required
          value={form.parentName}
          error={errors.parentName}
          onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
        />
        <TextField
          label={t("Parent Email")}
          type="email"
          required
          value={form.parentEmail}
          error={errors.parentEmail}
          onChange={(e) => setForm((f) => ({ ...f, parentEmail: e.target.value }))}
        />
        <TextField
          label={t("Parent Phone")}
          required
          value={form.parentPhone}
          error={errors.parentPhone}
          onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))}
        />

        <p className="text-xs text-slate-500">{t("A secure temporary password is generated automatically for the parent.")}</p>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={linkParent.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={linkParent.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {linkParent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Generate Parent Password")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ViewTempPasswordModal({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentTempPassword(studentId);

  return (
    <Modal open={Boolean(studentId)} onClose={onClose} title={t("Temporary Password")}>
      {isLoading && <p className="text-sm text-slate-500">{t("Loading...")}</p>}
      {!isLoading && data && (
        data.tempPassword ? (
          <TempPasswordReveal label={t("Temporary password")} password={data.tempPassword} onDone={onClose} />
        ) : (
          <p className="text-sm text-slate-500">{t("This student has already changed their password.")}</p>
        )
      )}
    </Modal>
  );
}

function ageFromBirthDate(dateOfBirth?: string | null): string {
  if (!dateOfBirth) return "-";
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return String(age);
}

function PasswordStatusBadge({ mustChangePassword }: { mustChangePassword: boolean }) {
  const { t } = useTranslation();
  return mustChangePassword ? (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
      {t("Not Changed")}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      {t("Changed")}
    </span>
  );
}

export function StudentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useUserRole();
  const isReception = role === "reception";
  const { data, isLoading } = useStudents();
  const deleteStudent = useDeleteStudent();
  const resetPassword = useResetStudentPassword();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [addDirectOpen, setAddDirectOpen] = useState(false);
  const [editing, setEditing] = useState<StudentDto | null>(null);
  const [deleting, setDeleting] = useState<StudentDto | null>(null);
  const [viewingHistoryFor, setViewingHistoryFor] = useState<StudentDto | null>(null);
  const [viewingRemindersFor, setViewingRemindersFor] = useState<StudentDto | null>(null);
  const [linkingParentFor, setLinkingParentFor] = useState<StudentDto | null>(null);
  const [viewingPasswordFor, setViewingPasswordFor] = useState<string | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<StudentDto | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteStudent.mutateAsync(deleting.id);
      showToast(t("Student deleted."));
      setDeleting(null);
    } catch {
      showToast(t("Failed to delete student."), "error");
    }
  }

  async function confirmResetPassword() {
    if (!resettingPasswordFor) return;
    try {
      const result = await resetPassword.mutateAsync(resettingPasswordFor.id);
      setResettingPasswordFor(null);
      setResetResult(result.tempPassword);
    } catch {
      showToast(t("Failed to reset password."), "error");
    }
  }

  return (
    <div>
      <SubscriptionLimitBanners resource="student" />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("Students")}</h1>
        <button
          onClick={() => {
            if (isReception) {
              setAddDirectOpen(true);
            } else {
              setEditing(null);
              setFormOpen(true);
            }
          }}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {isReception ? "Add Student" : "New Student"}
        </button>
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        emptyMessage='No students yet. Click "Add Student" to add one.'
        getRowKey={(s) => s.id}
        onRowClick={
          isReception
            ? (s) => {
                setEditing(s);
                setFormOpen(true);
              }
            : (s) => navigate(`/students/${s.id}/profile`)
        }
        columns={[
          {
            header: t("Name"),
            render: (s) =>
              // Reception has its own, simpler workflow (this page is shared
              // between /students and /reception/students) and no access to
              // the owner/admin-facing profile route — keep their row click
              // opening the edit modal, same as before this page linked out.
              isReception ? (
                <span className="font-medium text-slate-900 dark:text-slate-100">{s.name}</span>
              ) : (
                <Link
                  to={`/students/${s.id}/profile`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400"
                >
                  {s.name}
                </Link>
              ),
          },
          { header: t("Phone"), render: (s) => s.phone ?? "-" },
          { header: t("Age"), render: (s) => ageFromBirthDate(s.dateOfBirth), align: "right" },
          {
            header: t("Enrollment"),
            render: (s) => (
              <span className="capitalize">{s.enrollmentStatus.replace("_", " ")}</span>
            ),
          },
          { header: t("Password"), render: (s) => <PasswordStatusBadge mustChangePassword={s.mustChangePassword} /> },
          { header: t("Parent Contact"), render: (s) => s.parentPhone ?? "-" },
        ]}
        renderActions={(s) => (
          <>
            {isReception && (
              <button
                onClick={() => setLinkingParentFor(s)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t("Link parent")}
                title={t("Add/Edit Parent")}
              >
                <UserPlus className="h-4 w-4" />
              </button>
            )}
            {s.mustChangePassword && (
              <button
                onClick={() => setViewingPasswordFor(s.id)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t("View temporary password")}
                title={t("View temporary password")}
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {isReception && (
              <button
                onClick={() => setResettingPasswordFor(s)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t("Reset password")}
                title={t("Reset password")}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setViewingHistoryFor(s)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={t("View attendance history")}
              title={t("View attendance history")}
            >
              <CalendarClock className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewingRemindersFor(s)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={t("View reminders")}
              title={t("View reminders")}
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setEditing(s);
                setFormOpen(true);
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={t("Edit student")}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleting(s)}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={t("Delete student")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <StudentForm open={formOpen} onClose={() => setFormOpen(false)} student={editing} />
      <AddStudentDirectModal open={addDirectOpen} onClose={() => setAddDirectOpen(false)} />
      <LinkParentModal student={linkingParentFor} onClose={() => setLinkingParentFor(null)} />
      <ViewTempPasswordModal studentId={viewingPasswordFor} onClose={() => setViewingPasswordFor(null)} />

      <StudentAttendanceHistoryModal
        open={Boolean(viewingHistoryFor)}
        onClose={() => setViewingHistoryFor(null)}
        student={viewingHistoryFor}
      />

      <StudentRemindersModal
        open={Boolean(viewingRemindersFor)}
        onClose={() => setViewingRemindersFor(null)}
        student={viewingRemindersFor}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("Delete student")}
        message={`Are you sure you want to delete ${deleting?.name}? This cannot be undone.`}
        isConfirming={deleteStudent.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={Boolean(resettingPasswordFor)}
        title={t("Reset password")}
        message={`Generate a new temporary password for ${resettingPasswordFor?.name}? They will need to set a new password on next login.`}
        confirmLabel={resetPassword.isPending ? "Resetting..." : "Reset Password"}
        isConfirming={resetPassword.isPending}
        onConfirm={confirmResetPassword}
        onCancel={() => setResettingPasswordFor(null)}
      />

      <Modal open={Boolean(resetResult)} onClose={() => setResetResult(null)} title={t("Password Reset")}>
        {resetResult && (
          <TempPasswordReveal label={t("New temporary password")} password={resetResult} onDone={() => setResetResult(null)} />
        )}
      </Modal>
    </div>
  );
}
