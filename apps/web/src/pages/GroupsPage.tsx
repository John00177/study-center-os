import type { GroupDto, GroupStatus } from "@crm/shared-types";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { SelectField, TextField } from "../components/form/Field";
import { useBranches } from "../hooks/use-branches";
import { useCourses } from "../hooks/use-courses";
import {
  GroupInput,
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useUpdateGroup,
} from "../hooks/use-groups";
import { useTheme } from "../contexts/ThemeContext";
import { useUserRole } from "../stores/auth.store";

const STATUS_OPTIONS: GroupStatus[] = ["active", "inactive", "completed"];
const SCHEDULE_DAYS = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Yak"] as const;

interface FormState {
  name: string;
  branchId: string;
  courseId: string;
  status: GroupStatus;
  maxStudents: string;
  monthlyFee: string;
  scheduleDays: string[];
  startTime: string;
  endTime: string;
}

function toFormState(group?: GroupDto | null): FormState {
  return {
    name: group?.name ?? "",
    branchId: group?.branchId ?? "",
    courseId: group?.courseId ?? "",
    status: group?.status ?? "active",
    maxStudents: group?.maxStudents ? String(group.maxStudents) : "",
    monthlyFee: group?.monthlyFee != null ? String(group.monthlyFee) : "",
    scheduleDays: group?.scheduleDays ?? [],
    startTime: group?.startTime ?? "",
    endTime: group?.endTime ?? "",
  };
}

/** "Se, Cho, Pa | 19:00 - 20:30" — used by both the group list column and the display helper below. */
export function formatGroupSchedule(group: Pick<GroupDto, "scheduleDays" | "startTime" | "endTime">): string {
  const days = group.scheduleDays.length ? group.scheduleDays.join(", ") : "";
  const time = group.startTime && group.endTime ? `${group.startTime} - ${group.endTime}` : "";
  if (!days && !time) return "—";
  if (days && time) return `${days} | ${time}`;
  return days || time;
}

function GroupForm({
  open,
  onClose,
  group,
}: {
  open: boolean;
  onClose: () => void;
  group?: GroupDto | null;
}) {
  const isEditing = Boolean(group);
  const [form, setForm] = useState<FormState>(() => toFormState(group));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { branding } = useTheme();
  const hasBranches = (branding as { hasBranches?: boolean } | null)?.hasBranches ?? true;
  const { data: branches } = useBranches();
  const { data: courses } = useCourses();
  const selectedCourse = courses?.find((c) => c.id === form.courseId);
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const { showToast } = useToast();
  const isSaving = createGroup.isPending || updateGroup.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(group));
      setErrors({});
    }
  }, [open, group]);

  // Single-branch orgs never see the branch picker — silently use their one
  // branch instead of asking them to pick from a list of one.
  useEffect(() => {
    if (!hasBranches && !form.branchId && branches && branches.length > 0) {
      setForm((f) => ({ ...f, branchId: branches[0].id }));
    }
  }, [hasBranches, branches, form.branchId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (hasBranches && !form.branchId) nextErrors.branchId = "Branch is required.";
    if (!form.courseId) nextErrors.courseId = "Course is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const input: GroupInput = {
      name: form.name.trim(),
      branchId: form.branchId,
      courseId: form.courseId,
      status: form.status,
      maxStudents: form.maxStudents ? Number(form.maxStudents) : undefined,
      monthlyFee: form.monthlyFee.trim() !== "" ? Number(form.monthlyFee) : undefined,
      scheduleDays: form.scheduleDays,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
    };

    try {
      if (isEditing && group) {
        await updateGroup.mutateAsync({ id: group.id, ...input });
        showToast("Group updated.");
      } else {
        await createGroup.mutateAsync(input);
        showToast("Group created.");
      }
      onClose();
    } catch {
      showToast(isEditing ? "Failed to update group." : "Failed to create group.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Group" : "New Group"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Name"
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />

        <div className={`grid grid-cols-1 gap-4 ${hasBranches ? "sm:grid-cols-2" : ""}`}>
          {hasBranches && (
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
          )}
          <SelectField
            label="Course"
            required
            value={form.courseId}
            error={errors.courseId}
            onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
          >
            <option value="">Select course</option>
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.monthlyFee ? ` — ${new Intl.NumberFormat("en-US").format(c.monthlyFee)} UZS/month` : ""}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as GroupStatus }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Max students"
            type="number"
            min="1"
            value={form.maxStudents}
            onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))}
          />
        </div>

        <div>
          <TextField
            label="Monthly Fee override (UZS)"
            type="number"
            min="0"
            placeholder={
              selectedCourse?.monthlyFee
                ? `Defaults to course fee: ${new Intl.NumberFormat("en-US").format(selectedCourse.monthlyFee)}`
                : "Defaults to the course fee"
            }
            value={form.monthlyFee}
            onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))}
          />
          <p className="mt-1 text-xs text-slate-500">
            Optional. Leave blank to charge students the course's monthly fee.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Schedule Days</label>
          <div className="flex flex-wrap gap-2">
            {SCHEDULE_DAYS.map((day) => {
              const selected = form.scheduleDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      scheduleDays: selected ? f.scheduleDays.filter((d) => d !== day) : [...f.scheduleDays, day],
                    }))
                  }
                  className={`rounded-md border px-3 py-1 text-sm font-medium transition ${
                    selected
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Lesson Time</label>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-400">—</span>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save changes" : "Create group"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function GroupsPage() {
  const { data, isLoading } = useGroups();
  const deleteGroup = useDeleteGroup();
  const { showToast } = useToast();
  // Reception can view groups but the API already rejects their writes
  // (create/edit/delete require owner/admin/manager) — hide the controls
  // rather than let them hit a 403 toast.
  const role = useUserRole();
  const canManage = role !== "reception";
  const { branding } = useTheme();
  const hasBranches = (branding as { hasBranches?: boolean } | null)?.hasBranches ?? true;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GroupDto | null>(null);
  const [deleting, setDeleting] = useState<GroupDto | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteGroup.mutateAsync(deleting.id);
      showToast("Group deleted.");
      setDeleting(null);
    } catch {
      showToast("Failed to delete group.", "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Groups</h1>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Group
          </button>
        )}
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        emptyMessage='No groups yet. Click "New Group" to add one.'
        getRowKey={(g) => g.id}
        onRowClick={
          canManage
            ? (g) => {
                setEditing(g);
                setFormOpen(true);
              }
            : undefined
        }
        columns={[
          { header: "Name", render: (g) => <span className="font-medium text-slate-900 dark:text-slate-100">{g.name}</span> },
          ...(hasBranches ? [{ header: "Branch", render: (g: GroupDto) => g.branch?.name ?? "-" }] : []),
          { header: "Course", render: (g) => g.course?.name ?? "-" },
          { header: "Schedule", render: (g) => formatGroupSchedule(g) },
          { header: "Teachers", render: (g) => g.teacherCount, align: "right" },
          { header: "Students", render: (g) => g.studentCount, align: "right" },
        ]}
        renderActions={
          canManage
            ? (g) => (
                <>
                  <button
                    onClick={() => {
                      setEditing(g);
                      setFormOpen(true);
                    }}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Edit group"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(g)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )
            : undefined
        }
      />

      <GroupForm open={formOpen} onClose={() => setFormOpen(false)} group={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete group"
        message={`Are you sure you want to delete ${deleting?.name}? This cannot be undone.`}
        isConfirming={deleteGroup.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
