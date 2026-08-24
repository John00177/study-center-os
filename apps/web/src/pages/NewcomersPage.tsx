import type { StudentDto } from "@crm/shared-types";
import { Archive, Loader2, NotebookPen, Plus, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { SelectField, TextField } from "../components/form/Field";
import { useGroups } from "../hooks/use-groups";
import {
  useArchivedStudents,
  useArchiveStudent,
  useAddStudentNote,
  useConvertStudent,
  useNewcomers,
} from "../hooks/use-newcomers";
import { StudentInput, useCreateStudent } from "../hooks/use-students";

function RegisterNewcomerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createStudent = useCreateStudent();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", email: "", interestedCourse: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.phone.trim()) nextErrors.phone = "Phone is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const input: StudentInput = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      interestedCourse: form.interestedCourse.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      await createStudent.mutateAsync(input);
      showToast("Newcomer registered.");
      setForm({ name: "", phone: "", email: "", interestedCourse: "", notes: "" });
      setErrors({});
      onClose();
    } catch {
      showToast("Failed to register newcomer.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Register New Student">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Name"
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <TextField
          label="Phone"
          required
          value={form.phone}
          error={errors.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <TextField
          label="Interested course"
          value={form.interestedCourse}
          onChange={(e) => setForm((f) => ({ ...f, interestedCourse: e.target.value }))}
        />
        <TextField
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createStudent.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createStudent.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {createStudent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConvertToGroupModal({
  open,
  onClose,
  student,
}: {
  open: boolean;
  onClose: () => void;
  student: StudentDto | null;
}) {
  const { data: groups } = useGroups();
  const convertStudent = useConvertStudent();
  const { showToast } = useToast();
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!student) return;
    if (!groupId) {
      setError("Select a group.");
      return;
    }
    try {
      await convertStudent.mutateAsync({ id: student.id, groupId });
      const groupName = groups?.find((g) => g.id === groupId)?.name ?? "the group";
      showToast(`Student moved to ${groupName}`);
      setGroupId("");
      setError(null);
      onClose();
    } catch {
      showToast("Failed to add student to group.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={student ? `Add ${student.name} to a Group` : "Add to Group"}>
      <div className="space-y-4">
        <SelectField label="Group" required value={groupId} error={error ?? undefined} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Select group</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </SelectField>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={convertStudent.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={convertStudent.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {convertStudent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddNoteModal({
  open,
  onClose,
  student,
}: {
  open: boolean;
  onClose: () => void;
  student: StudentDto | null;
}) {
  const addNote = useAddStudentNote();
  const { showToast } = useToast();
  const [note, setNote] = useState("");

  async function handleSave() {
    if (!student || !note.trim()) return;
    try {
      await addNote.mutateAsync({ id: student.id, note: note.trim() });
      showToast("Note added.");
      setNote("");
      onClose();
    } catch {
      showToast("Failed to add note.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={student ? `Add Note — ${student.name}` : "Add Note"}>
      <div className="space-y-4">
        {student?.notes && (
          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-500 whitespace-pre-wrap">
            {student.notes}
          </div>
        )}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Add a note..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={addNote.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={addNote.isPending || !note.trim()}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {addNote.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save note
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function NewcomersPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const { data: newcomers, isLoading: newcomersLoading } = useNewcomers();
  const { data: archived, isLoading: archivedLoading } = useArchivedStudents();
  const archiveStudent = useArchiveStudent();
  const { showToast } = useToast();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [convertingStudent, setConvertingStudent] = useState<StudentDto | null>(null);
  const [notingStudent, setNotingStudent] = useState<StudentDto | null>(null);
  const [archivingStudent, setArchivingStudent] = useState<StudentDto | null>(null);

  const source = showArchived ? archived : newcomers;
  const isLoading = showArchived ? archivedLoading : newcomersLoading;

  const filtered = useMemo(() => {
    if (!source) return source;
    const term = search.trim().toLowerCase();
    if (!term) return source;
    return source.filter(
      (s) => s.name.toLowerCase().includes(term) || (s.phone ?? "").toLowerCase().includes(term),
    );
  }, [source, search]);

  async function confirmArchive() {
    if (!archivingStudent) return;
    try {
      await archiveStudent.mutateAsync(archivingStudent.id);
      showToast("Student archived.");
      setArchivingStudent(null);
    } catch {
      showToast("Failed to archive student.", "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Newcomers</h1>
        <button
          onClick={() => setRegisterOpen(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Register New Student
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
          <button
            onClick={() => setShowArchived(false)}
            className={`rounded px-3 py-1.5 font-medium ${!showArchived ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            All
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`rounded px-3 py-1.5 font-medium ${showArchived ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Archived
          </button>
        </div>
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage={showArchived ? "No archived students." : 'No newcomers yet. Click "Register New Student" to add one.'}
        getRowKey={(s) => s.id}
        columns={[
          { header: "Name", render: (s) => <span className="font-medium text-slate-900">{s.name}</span> },
          { header: "Phone", render: (s) => s.phone ?? "-" },
          { header: "Interested Course", render: (s) => s.interestedCourse ?? "-" },
          { header: "Registered", render: (s) => new Date(s.registeredAt).toLocaleDateString() },
          { header: "Status", render: (s) => <span className="capitalize">{s.status}</span> },
        ]}
        renderActions={(s) => (
          <>
            {!showArchived && (
              <button
                onClick={() => setConvertingStudent(s)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Add to group"
                title="Add to group"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setNotingStudent(s)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Add note"
              title="Add note"
            >
              <NotebookPen className="h-4 w-4" />
            </button>
            {!showArchived && (
              <button
                onClick={() => setArchivingStudent(s)}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Archive"
                title="Archive"
              >
                <Archive className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      />

      <RegisterNewcomerModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
      <ConvertToGroupModal
        open={Boolean(convertingStudent)}
        onClose={() => setConvertingStudent(null)}
        student={convertingStudent}
      />
      <AddNoteModal open={Boolean(notingStudent)} onClose={() => setNotingStudent(null)} student={notingStudent} />

      <ConfirmDialog
        open={Boolean(archivingStudent)}
        title="Archive student"
        message={`Are you sure you want to archive ${archivingStudent?.name}? They will be removed from the newcomers list.`}
        confirmLabel="Archive"
        isConfirming={archiveStudent.isPending}
        onConfirm={confirmArchive}
        onCancel={() => setArchivingStudent(null)}
      />
    </div>
  );
}
