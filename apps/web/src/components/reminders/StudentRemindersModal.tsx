import type { ReminderStatus, StudentDto } from "@crm/shared-types";
import { DataTable } from "../DataTable";
import { Modal } from "../Modal";
import { useStudentReminderHistory } from "../../hooks/use-reminders";
import { formatCurrency } from "../../lib/format";
import { useTranslation } from "../../hooks/use-translation";

const STATUS_STYLES: Record<ReminderStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

interface StudentRemindersModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentDto | null;
}

export function StudentRemindersModal({ open, onClose, student }: StudentRemindersModalProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentReminderHistory(open ? student?.id ?? null : null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? `Reminders — ${student.name}` : "Reminders"}
      widthClassName="max-w-xl"
    >
      <DataTable
        data={data}
        isLoading={isLoading}
        emptyMessage={t("No reminders sent yet.")}
        getRowKey={(r) => r.id}
        columns={[
          { header: t("Amount"), render: (r) => (r.charge ? formatCurrency(r.charge.amount, r.charge.currency) : "-") },
          { header: t("Type"), render: (r) => <span className="uppercase">{r.type}</span> },
          {
            header: t("Status"),
            render: (r) => (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[r.status]}`}
              >
                {r.status}
              </span>
            ),
          },
          { header: t("Sent at"), render: (r) => new Date(r.createdAt).toLocaleString() },
        ]}
      />
    </Modal>
  );
}
