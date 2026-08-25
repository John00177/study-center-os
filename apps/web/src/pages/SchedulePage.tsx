import type { ScheduleDto } from "@crm/shared-types";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { SelectField, TextField } from "../components/form/Field";
import { useGroups } from "../hooks/use-groups";
import {
  ScheduleInput,
  useCreateSchedule,
  useDeleteSchedule,
  useSchedules,
  useUpdateSchedule,
} from "../hooks/use-schedules";
import { useUserRole } from "../stores/auth.store";
import { useTranslation } from "../hooks/use-translation";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface FormState {
  groupId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

function toFormState(schedule?: ScheduleDto | null): FormState {
  return {
    groupId: schedule?.groupId ?? "",
    dayOfWeek: schedule ? String(schedule.dayOfWeek) : "1",
    startTime: schedule?.startTime ?? "",
    endTime: schedule?.endTime ?? "",
  };
}

function ScheduleForm({
  open,
  onClose,
  schedule,
}: {
  open: boolean;
  onClose: () => void;
  schedule?: ScheduleDto | null;
}) {
  const { t } = useTranslation();
  const isEditing = Boolean(schedule);
  const [form, setForm] = useState<FormState>(() => toFormState(schedule));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: groups } = useGroups();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const { showToast } = useToast();
  const isSaving = createSchedule.isPending || updateSchedule.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(schedule));
      setErrors({});
    }
  }, [open, schedule]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.groupId) nextErrors.groupId = "Group is required.";
    if (!form.startTime) nextErrors.startTime = "Start time is required.";
    if (!form.endTime) nextErrors.endTime = "End time is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const group = groups?.find((g) => g.id === form.groupId);

    const input: ScheduleInput = {
      groupId: form.groupId,
      branchId: group?.branchId ?? "",
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime: form.endTime,
    };

    try {
      if (isEditing && schedule) {
        await updateSchedule.mutateAsync({ id: schedule.id, ...input });
        showToast(t("Schedule updated."));
      } else {
        await createSchedule.mutateAsync(input);
        showToast(t("Schedule created."));
      }
      onClose();
    } catch {
      showToast(isEditing ? "Failed to update schedule." : "Failed to create schedule.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Schedule" : "New Schedule"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label={t("Group")}
          required
          value={form.groupId}
          error={errors.groupId}
          onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
        >
          <option value="">{t("Select group")}</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label={t("Day of week")}
          value={form.dayOfWeek}
          onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
        >
          {DAY_LABELS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </SelectField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label={t("Start time")}
            type="time"
            required
            value={form.startTime}
            error={errors.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
          />
          <TextField
            label={t("End time")}
            type="time"
            required
            value={form.endTime}
            error={errors.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
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
            {isEditing ? "Save changes" : "Create schedule"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SchedulePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useSchedules();
  const deleteSchedule = useDeleteSchedule();
  const { showToast } = useToast();
  // Reception has read-only schedule access — writes already require
  // owner/admin/manager at the API level.
  const role = useUserRole();
  const canManage = role !== "reception";

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleDto | null>(null);
  const [deleting, setDeleting] = useState<ScheduleDto | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteSchedule.mutateAsync(deleting.id);
      showToast(t("Schedule entry deleted."));
      setDeleting(null);
    } catch {
      showToast(t("Failed to delete schedule entry."), "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("Schedule")}</h1>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            {t("New Schedule Entry")}
          </button>
        )}
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        emptyMessage='No schedule entries yet. Click "New Schedule Entry" to add one.'
        getRowKey={(s) => s.id}
        onRowClick={
          canManage
            ? (s) => {
                setEditing(s);
                setFormOpen(true);
              }
            : undefined
        }
        columns={[
          { header: t("Day"), render: (s) => DAY_LABELS[s.dayOfWeek] ?? s.dayOfWeek },
          { header: t("Time"), render: (s) => `${s.startTime} - ${s.endTime}` },
          { header: t("Group"), render: (s) => s.group?.name ?? "-" },
          { header: t("Classroom"), render: (s) => s.classroom?.name ?? "-" },
        ]}
        renderActions={
          canManage
            ? (s) => (
                <>
                  <button
                    onClick={() => {
                      setEditing(s);
                      setFormOpen(true);
                    }}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={t("Edit schedule entry")}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(s)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={t("Delete schedule entry")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )
            : undefined
        }
      />

      <ScheduleForm open={formOpen} onClose={() => setFormOpen(false)} schedule={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("Delete schedule entry")}
        message="Are you sure you want to delete this schedule entry? This cannot be undone."
        isConfirming={deleteSchedule.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
