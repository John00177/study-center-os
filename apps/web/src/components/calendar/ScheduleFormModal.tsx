import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { SelectField, TextField } from "../form/Field";
import { checkScheduleConflict } from "../../hooks/use-calendar";
import { useClassrooms } from "../../hooks/use-classrooms";
import { useGroups } from "../../hooks/use-groups";
import { ScheduleInput, useCreateSchedule, useSchedules, useUpdateSchedule } from "../../hooks/use-schedules";
import { DAY_LABELS } from "../../lib/week";

interface ScheduleFormModalProps {
  open: boolean;
  onClose: () => void;
  initialSlot?: { dayOfWeek: number; startTime: string; endTime: string } | null;
  editSessionId?: string | null;
}

interface FormState {
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroomId: string;
}

export function ScheduleFormModal({ open, onClose, initialSlot, editSessionId }: ScheduleFormModalProps) {
  const isEditing = Boolean(editSessionId);
  const { data: groups } = useGroups();
  const { data: classrooms } = useClassrooms();
  const { data: schedules } = useSchedules();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const { showToast } = useToast();

  const editingSchedule = useMemo(
    () => schedules?.find((s) => s.id === editSessionId) ?? null,
    [schedules, editSessionId],
  );

  const [form, setForm] = useState<FormState>({
    groupId: "",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
    classroomId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const isSaving = createSchedule.isPending || updateSchedule.isPending;

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (isEditing && editingSchedule) {
      setForm({
        groupId: editingSchedule.groupId,
        dayOfWeek: editingSchedule.dayOfWeek,
        startTime: editingSchedule.startTime,
        endTime: editingSchedule.endTime,
        classroomId: editingSchedule.classroomId ?? "",
      });
    } else if (initialSlot) {
      setForm({
        groupId: "",
        dayOfWeek: initialSlot.dayOfWeek,
        startTime: initialSlot.startTime,
        endTime: initialSlot.endTime,
        classroomId: "",
      });
    }
  }, [open, isEditing, editingSchedule, initialSlot]);

  const selectedGroup = groups?.find((g) => g.id === form.groupId);
  const classroomsForBranch = classrooms?.filter((c) => !selectedGroup || c.branchId === selectedGroup.branchId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.groupId) {
      setError("Select a group.");
      return;
    }
    if (!selectedGroup) {
      setError("Selected group could not be found.");
      return;
    }
    if (form.startTime >= form.endTime) {
      setError("End time must be after start time.");
      return;
    }

    try {
      const conflict = await checkScheduleConflict({
        groupId: form.groupId,
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        classroomId: form.classroomId || undefined,
        excludeId: editSessionId ?? undefined,
      });
      if (conflict) {
        setError("This time conflicts with another session in the same classroom or the same group.");
        return;
      }

      const input: ScheduleInput = {
        groupId: form.groupId,
        branchId: selectedGroup.branchId,
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        classroomId: form.classroomId || undefined,
      };

      if (isEditing && editSessionId) {
        await updateSchedule.mutateAsync({ id: editSessionId, ...input });
        showToast("Session updated.");
      } else {
        await createSchedule.mutateAsync(input);
        showToast("Session created.");
      }
      onClose();
    } catch (err) {
      if (isAxiosError(err) && typeof err.response?.data?.message === "string") {
        setError(err.response.data.message);
      } else {
        showToast(isEditing ? "Failed to update session." : "Failed to create session.", "error");
      }
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Session" : "New Session"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Group"
          required
          value={form.groupId}
          onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
        >
          <option value="">Select group</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Day of week"
          value={form.dayOfWeek}
          onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
        >
          {DAY_LABELS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </SelectField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Start time"
            type="time"
            required
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
          />
          <TextField
            label="End time"
            type="time"
            required
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
          />
        </div>

        <SelectField
          label="Classroom"
          value={form.classroomId}
          onChange={(e) => setForm((f) => ({ ...f, classroomId: e.target.value }))}
        >
          <option value="">No classroom</option>
          {classroomsForBranch?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>

        {error && <p className="text-sm text-red-600">{error}</p>}

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
            {isEditing ? "Save changes" : "Create session"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
