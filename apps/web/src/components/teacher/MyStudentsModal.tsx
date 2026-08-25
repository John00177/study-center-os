import { useState } from "react";
import { DataTable } from "../DataTable";
import { Modal } from "../Modal";
import { TextField } from "../form/Field";
import { useAllTeacherStudents } from "../../hooks/use-teacher-dashboard";

interface MyStudentsModalProps {
  open: boolean;
  onClose: () => void;
}

export function MyStudentsModal({ open, onClose }: MyStudentsModalProps) {
  const { data, isLoading } = useAllTeacherStudents(open);
  const [search, setSearch] = useState("");

  const rows = (data ?? []).filter((row) =>
    row.student.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Modal open={open} onClose={onClose} title="My Students" widthClassName="max-w-2xl">
      <div className="mb-4">
        <TextField
          label="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students..."
        />
      </div>

      <DataTable
        data={rows}
        isLoading={isLoading}
        emptyMessage={
          !isLoading && (data ?? []).length === 0
            ? "No students assigned yet."
            : "No students match your search."
        }
        getRowKey={(r) => `${r.groupId}-${r.student.id}`}
        columns={[
          { header: "Student Name", render: (r) => <span className="font-medium text-slate-900 dark:text-slate-100">{r.student.name}</span> },
          { header: "Group/Class", render: (r) => r.groupName },
          { header: "Phone", render: (r) => r.student.phone ?? "-" },
          { header: "Email", render: (r) => r.student.email ?? "-" },
          { header: "Enrollment Date", render: (r) => new Date(r.enrolledAt).toLocaleDateString() },
        ]}
      />
    </Modal>
  );
}
