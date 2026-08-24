import type { ParentDto } from "@crm/shared-types";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { TextField } from "../components/form/Field";
import {
  ParentInput,
  useCreateParent,
  useDeleteParent,
  useParents,
  useUpdateParent,
} from "../hooks/use-parents";

interface FormState {
  name: string;
  email: string;
  phone: string;
}

function toFormState(parent?: ParentDto | null): FormState {
  return {
    name: parent?.name ?? "",
    email: parent?.email ?? "",
    phone: parent?.phone ?? "",
  };
}

function ParentForm({
  open,
  onClose,
  parent,
}: {
  open: boolean;
  onClose: () => void;
  parent?: ParentDto | null;
}) {
  const isEditing = Boolean(parent);
  const [form, setForm] = useState<FormState>(() => toFormState(parent));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createParent = useCreateParent();
  const updateParent = useUpdateParent();
  const { showToast } = useToast();
  const isSaving = createParent.isPending || updateParent.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(parent));
      setErrors({});
    }
  }, [open, parent]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: "Name is required." });
      return;
    }

    const input: ParentInput = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
    };

    try {
      if (isEditing && parent) {
        await updateParent.mutateAsync({ id: parent.id, ...input });
        showToast("Parent updated.");
      } else {
        await createParent.mutateAsync(input);
        showToast("Parent created.");
      }
      onClose();
    } catch {
      showToast(isEditing ? "Failed to update parent." : "Failed to create parent.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Parent" : "New Parent"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Name"
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>

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
            {isEditing ? "Save changes" : "Create parent"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ParentsPage() {
  const { data, isLoading } = useParents();
  const deleteParent = useDeleteParent();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ParentDto | null>(null);
  const [deleting, setDeleting] = useState<ParentDto | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteParent.mutateAsync(deleting.id);
      showToast("Parent deleted.");
      setDeleting(null);
    } catch {
      showToast("Failed to delete parent.", "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Parents</h1>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Parent
        </button>
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        emptyMessage='No parents yet. Click "New Parent" to add one.'
        getRowKey={(p) => p.id}
        onRowClick={(p) => {
          setEditing(p);
          setFormOpen(true);
        }}
        columns={[
          { header: "Name", render: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
          { header: "Phone", render: (p) => p.phone ?? "-" },
        ]}
        renderActions={(p) => (
          <>
            <button
              onClick={() => {
                setEditing(p);
                setFormOpen(true);
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Edit parent"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleting(p)}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete parent"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <ParentForm open={formOpen} onClose={() => setFormOpen(false)} parent={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete parent"
        message={`Are you sure you want to delete ${deleting?.name}? This cannot be undone.`}
        isConfirming={deleteParent.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
