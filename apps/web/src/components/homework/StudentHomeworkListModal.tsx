import type { SubmissionStatus } from "@crm/shared-types";
import { DataTable } from "../DataTable";
import { Modal } from "../Modal";
import { useStudentHomework } from "../../hooks/use-homework";
import { useTranslation } from "../../hooks/use-translation";

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  graded: "bg-green-100 text-green-700",
  late: "bg-red-100 text-red-700",
};

interface StudentHomeworkListModalProps {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
  studentName?: string;
}

export function StudentHomeworkListModal({ open, onClose, studentId, studentName }: StudentHomeworkListModalProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentHomework(open ? studentId : null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={studentName ? `Homework — ${studentName}` : "Homework"}
      widthClassName="max-w-xl"
    >
      <DataTable
        data={data}
        isLoading={isLoading}
        emptyMessage={t("No homework assigned yet.")}
        getRowKey={(h) => h.submissionId}
        columns={[
          { header: t("Title"), render: (h) => h.title },
          { header: t("Group"), render: (h) => h.group?.name ?? "-" },
          { header: t("Due date"), render: (h) => (h.dueDate ? new Date(h.dueDate).toLocaleDateString() : "-") },
          {
            header: t("Status"),
            render: (h) => (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[h.submissionStatus]}`}>
                {h.submissionStatus}
              </span>
            ),
          },
          { header: t("Score"), render: (h) => (h.score !== null && h.score !== undefined ? h.score : "-") },
        ]}
      />
    </Modal>
  );
}
