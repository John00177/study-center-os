import type { BranchDto, BranchStatus } from "@crm/shared-types";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { SelectField, TextField } from "../components/form/Field";
import { SubscriptionLimitBanners } from "../components/subscription/SubscriptionLimitBanners";
import { errorMessage } from "../lib/plan-lock";
import {
  BranchInput,
  useBranches,
  useCreateBranch,
  useDeleteBranch,
  useUpdateBranch,
} from "../hooks/use-branches";

const STATUS_OPTIONS: BranchStatus[] = ["active", "inactive"];

interface FormState {
  name: string;
  address: string;
  phone: string;
  email: string;
  status: BranchStatus;
}

function toFormState(branch?: BranchDto | null): FormState {
  return {
    name: branch?.name ?? "",
    address: branch?.address ?? "",
    phone: branch?.phone ?? "",
    email: branch?.email ?? "",
    status: branch?.status ?? "active",
  };
}

function BranchForm({
  open,
  onClose,
  branch,
}: {
  open: boolean;
  onClose: () => void;
  branch?: BranchDto | null;
}) {
  const isEditing = Boolean(branch);
  const [form, setForm] = useState<FormState>(() => toFormState(branch));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const { showToast } = useToast();
  const isSaving = createBranch.isPending || updateBranch.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(branch));
      setErrors({});
    }
  }, [open, branch]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: "Name is required." });
      return;
    }

    const input: BranchInput = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      status: form.status,
    };

    try {
      if (isEditing && branch) {
        await updateBranch.mutateAsync({ id: branch.id, ...input });
        showToast("Branch updated.");
      } else {
        await createBranch.mutateAsync(input);
        showToast("Branch created.");
      }
      onClose();
    } catch (err) {
      showToast(errorMessage(err, isEditing ? "Failed to update branch." : "Failed to create branch."), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Branch" : "New Branch"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Name"
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <TextField
          label="Address"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <SelectField
          label="Status"
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BranchStatus }))}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>

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
            {isEditing ? "Save changes" : "Create branch"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function BranchesPage() {
  const { data, isLoading } = useBranches();
  const deleteBranch = useDeleteBranch();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BranchDto | null>(null);
  const [deleting, setDeleting] = useState<BranchDto | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteBranch.mutateAsync(deleting.id);
      showToast("Branch deleted.");
      setDeleting(null);
    } catch {
      showToast("Failed to delete branch.", "error");
    }
  }

  return (
    <div>
      <SubscriptionLimitBanners resource="branch" />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Branches</h1>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Branch
        </button>
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        emptyMessage='No branches yet. Click "New Branch" to add one.'
        getRowKey={(b) => b.id}
        onRowClick={(b) => {
          setEditing(b);
          setFormOpen(true);
        }}
        columns={[
          { header: "Name", render: (b) => <span className="font-medium text-slate-900 dark:text-slate-100">{b.name}</span> },
          { header: "Status", render: (b) => <span className="capitalize">{b.status}</span> },
          { header: "Address", render: (b) => b.address ?? "-" },
        ]}
        renderActions={(b) => (
          <>
            <button
              onClick={() => {
                setEditing(b);
                setFormOpen(true);
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Edit branch"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleting(b)}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete branch"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <BranchForm open={formOpen} onClose={() => setFormOpen(false)} branch={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete branch"
        message={`Are you sure you want to delete ${deleting?.name}? This cannot be undone.`}
        isConfirming={deleteBranch.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
