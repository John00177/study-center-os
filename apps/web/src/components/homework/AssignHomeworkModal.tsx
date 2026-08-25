import type { LessonDto } from "@crm/shared-types";
import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { SelectField, TextField } from "../form/Field";
import { useCreateHomework } from "../../hooks/use-homework";
import { useTranslation } from "../../hooks/use-translation";

interface AssignHomeworkModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  lessons: LessonDto[] | undefined;
}

export function AssignHomeworkModal({ open, onClose, groupId, lessons }: AssignHomeworkModalProps) {
  const { t } = useTranslation();
  const createHomework = useCreateHomework();
  const { showToast } = useToast();
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", lessonId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm({ title: "", description: "", dueDate: "", lessonId: "" });
      setErrors({});
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = "Title is required.";
    if (!form.dueDate) nextErrors.dueDate = "Due date is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      await createHomework.mutateAsync({
        groupId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        dueDate: form.dueDate,
        lessonId: form.lessonId || undefined,
      });
      showToast(t("Homework assigned."));
      onClose();
    } catch {
      showToast(t("Failed to assign homework."), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Assign Homework")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t("Title")}
          required
          value={form.title}
          error={errors.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t("Description")}</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <TextField
          label={t("Due date")}
          type="date"
          required
          value={form.dueDate}
          error={errors.dueDate}
          onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
        />
        <SelectField
          label={t("Link to lesson")}
          value={form.lessonId}
          onChange={(e) => setForm((f) => ({ ...f, lessonId: e.target.value }))}
        >
          <option value="">{t("No lesson link")}</option>
          {lessons?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title} ({new Date(l.date).toLocaleDateString()})
            </option>
          ))}
        </SelectField>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createHomework.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={createHomework.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {createHomework.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Assign")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
