import type { ParentHomeworkDto, SubmissionStatus } from "@crm/shared-types";
import { useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { useParentHomework } from "../../hooks/use-parent-portal";
import { useTranslation } from "../../hooks/use-translation";

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  submitted: "bg-blue-100 text-blue-700",
  graded: "bg-green-100 text-green-700",
  late: "bg-red-100 text-red-700",
};

type Filter = "all" | "pending" | "graded";

export function ParentHomeworkPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useParentHomework();
  const [selected, setSelected] = useState<ParentHomeworkDto | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return data;
    if (filter === "pending") return data?.filter((h) => h.submissionStatus === "pending" || h.submissionStatus === "late");
    return data?.filter((h) => h.submissionStatus === "graded");
  }, [data, filter]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">{t("Loading...")}</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">{t("Homework")}</h1>

      <div className="mb-4 flex gap-2">
        {(["all", "pending", "graded"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${
              filter === f ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {(!filtered || filtered.length === 0) && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">{t("No homework found.")}</p>
      )}

      <div className="space-y-2">
        {filtered?.map((h) => (
          <button
            key={h.submissionId}
            onClick={() => setSelected(h)}
            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-slate-900">{h.title}</p>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[h.submissionStatus]}`}
              >
                {h.submissionStatus}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {h.group?.name} · {h.teacherName}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Due {h.dueDate ? new Date(h.dueDate).toLocaleDateString() : "-"}
            </p>
          </button>
        ))}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title ?? "Homework"}>
        {selected && (
          <div className="space-y-3 text-sm">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[selected.submissionStatus]}`}
            >
              {selected.submissionStatus}
            </span>
            {selected.description && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">{t("Description")}</p>
                <p className="text-slate-900">{selected.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">{t("Teacher")}</p>
              <p className="text-slate-900">{selected.teacherName}</p>
            </div>
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
