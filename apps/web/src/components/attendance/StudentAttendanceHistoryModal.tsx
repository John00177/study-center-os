import type { StudentDto } from "@crm/shared-types";
import { DataTable } from "../DataTable";
import { Modal } from "../Modal";
import { useStudentAttendanceHistory } from "../../hooks/use-attendance";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";

interface StudentAttendanceHistoryModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentDto | null;
}

export function StudentAttendanceHistoryModal({
  open,
  onClose,
  student,
}: StudentAttendanceHistoryModalProps) {
  const { data, isLoading } = useStudentAttendanceHistory(open ? student?.id ?? null : null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? `Attendance history — ${student.name}` : "Attendance history"}
      widthClassName="max-w-xl"
    >
      <DataTable
        data={data}
        isLoading={isLoading}
        emptyMessage="No attendance records yet."
        getRowKey={(a) => a.id}
        columns={[
          { header: "Date", render: (a) => new Date(a.date).toLocaleDateString() },
          { header: "Group", render: (a) => a.group?.name ?? "-" },
          { header: "Status", render: (a) => <AttendanceStatusBadge status={a.status} /> },
          { header: "Notes", render: (a) => a.notes ?? "-" },
        ]}
      />
    </Modal>
  );
}
