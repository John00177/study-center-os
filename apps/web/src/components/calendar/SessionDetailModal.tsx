import type { CalendarSessionDto } from "@crm/shared-types";
import { Loader2, Pencil, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { useDeleteSchedule } from "../../hooks/use-schedules";
import { useUserRole } from "../../stores/auth.store";
import { DAY_LABELS } from "../../lib/week";
import { useTranslation } from "../../hooks/use-translation";

interface SessionDetailModalProps {
  session: CalendarSessionDto | null;
  date: string | null;
  onClose: () => void;
  onEdit: () => void;
}

export function SessionDetailModal({ session, date, onClose, onEdit }: SessionDetailModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useUserRole();
  const deleteSchedule = useDeleteSchedule();
  const { showToast } = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!session) return null;

  async function handleDelete() {
    if (!session) return;
    try {
      await deleteSchedule.mutateAsync(session.id);
      showToast(t("Session deleted."));
      setConfirmingDelete(false);
      onClose();
    } catch {
      showToast(t("Failed to delete session."), "error");
    }
  }

  function handleTakeAttendance() {
    if (!session?.group) return;
    if (role === "teacher") {
      navigate(`/teacher/groups/${session.group.id}?tab=attendance`);
    } else {
      navigate(`/attendance?groupId=${session.group.id}&date=${date ?? ""}`);
    }
  }

  return (
    <>
      <Modal open={Boolean(session)} onClose={onClose} title={session.group?.name ?? "Session"}>
        <div className="space-y-3 text-sm">
          <DetailRow label={t("Course")} value={session.course?.name ?? "-"} />
          <DetailRow label={t("Day")} value={DAY_LABELS[session.dayOfWeek]} />
          <DetailRow label={t("Time")} value={`${session.startTime} - ${session.endTime}`} />
          <DetailRow label={t("Teacher")} value={session.teacher?.name ?? "Unassigned"} />
          <DetailRow label={t("Classroom")} value={session.classroom?.name ?? "-"} />
          <DetailRow label={t("Branch")} value={session.branch?.name ?? "-"} />
          <DetailRow label={t("Students")} value={String(session.studentCount)} />

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              onClick={handleTakeAttendance}
              className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <UserCheck className="h-4 w-4" />
              {t("Take Attendance")}
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              {t("Edit")}
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              {deleteSchedule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("Delete")}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmingDelete}
        title={t("Delete session")}
        message={`Are you sure you want to delete this ${session.group?.name ?? "session"} session? This cannot be undone.`}
        isConfirming={deleteSchedule.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}
