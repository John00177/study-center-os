import type { StudentHomeworkDto, SubmissionStatus } from "@crm/shared-types";
import { useState } from "react";
import { Modal } from "../../components/Modal";
import { useStudentPortalHomework } from "../../hooks/use-student-portal";
import { useTranslation } from "../../hooks/use-translation";

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  submitted: "bg-blue-100 text-blue-700",
  graded: "bg-green-100 text-green-700",
  late: "bg-red-100 text-red-700",
};

export function StudentHomeworkPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentPortalHomework();
  const [selected, setSelected] = useState<StudentHomeworkDto | null>(null);

  if (isLoading) {
    return <p className="text-sm text-slate-500">{t("Loading...")}</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">{t("My Homework")}</h1>

      {(data ?? []).length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          {t("No homework assigned yet.")}
        </p>
      )}

      <div className="space-y-2">
        {(data ?? []).map((h) => (
          <button
            key={h.submissionId}
            onClick={() => setSelected(h)}
            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-slate-900">{h.title}</p>
              <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[h.submissionStatus]}`}>
                {h.submissionStatus}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{h.group?.name}</p>
            <p className="mt-1 text-xs text-slate-400">
              Due {h.dueDate ? new Date(h.dueDate).toLocaleDateString() : "-"}
            </p>
          </button>
        ))}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title ?? "Homework"}>
        {selected && (
          <div className="space-y-3 text-sm">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[selected.submissionStatus]}`}>
              {selected.submissionStatus}
            </span>
            {selected.description && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">{t("Description")}</p>
                <p className="text-slate-900">{selected.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">{t("Due date")}</p>
              <p className="text-slate-900">{selected.dueDate ? new Date(selected.dueDate).toLocaleDateString() : "-"}</p>
            </div>
            {selected.score !== null && selected.score !== undefined && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">{t("Score")}</p>
                <p className="text-slate-900">{selected.score} / 100</p>
              </div>
            )}
            {selected.feedback && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">{t("Feedback")}</p>
                <p className="text-slate-900">{selected.feedback}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
