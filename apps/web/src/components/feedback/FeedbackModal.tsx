import { FormEvent, useEffect, useState } from "react";
import type { TicketPriority, TicketType } from "@crm/shared-types";
import { Bug, HelpCircle, Lightbulb, Loader2, StickyNote } from "lucide-react";
import { Modal } from "../Modal";
import { SelectField, TextField } from "../form/Field";
import { useToast } from "../Toast";
import { useCreateTicket } from "../../hooks/use-support-tickets";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  basePath: string;
  profile: { name: string; email?: string | null; phone?: string | null };
  onSubmitted?: () => void;
}

const TYPE_OPTIONS: { value: TicketType; label: string; icon: typeof Bug }[] = [
  { value: "issue", label: "Bug / Issue", icon: Bug },
  { value: "idea", label: "Feature Idea", icon: Lightbulb },
  { value: "question", label: "Question", icon: HelpCircle },
  { value: "other", label: "Other", icon: StickyNote },
];

const EMPTY_FORM = { type: "issue" as TicketType, title: "", description: "", priority: "medium" as TicketPriority };

export function FeedbackModal({ open, onClose, basePath, profile, onSubmitted }: FeedbackModalProps) {
  const createTicket = useCreateTicket(basePath);
  const { showToast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactName, setContactName] = useState(profile.name);
  const [contactEmail, setContactEmail] = useState(profile.email ?? "");
  const [contactPhone, setContactPhone] = useState(profile.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setContactName(profile.name);
      setContactEmail(profile.email ?? "");
      setContactPhone(profile.phone ?? "");
      setErrors({});
      setContactOpen(false);
    }
    // profile is stable per session — only re-seed on open, not on every profile object identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const titleLen = form.title.length;
  const descLen = form.description.length;
  const canSubmit = form.title.trim().length >= 5 && form.description.trim().length >= 20 && !createTicket.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.title.trim().length < 5) nextErrors.title = "Title must be at least 5 characters.";
    if (form.description.trim().length < 20) nextErrors.description = "Description must be at least 20 characters.";
    if (!contactEmail.trim() && !contactPhone.trim()) {
      nextErrors.contact = "Provide at least an email or phone number so we can follow up.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      if (nextErrors.contact) setContactOpen(true);
      return;
    }

    try {
      await createTicket.mutateAsync({
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        priority: form.type === "issue" ? form.priority : undefined,
      });
      showToast("Thank you! We'll review your feedback and contact you soon.");
      onSubmitted?.();
      onClose();
    } catch {
      showToast("Failed to send feedback. Please try again.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send Feedback" widthClassName="max-w-lg">
      <p className="-mt-2 mb-4 text-sm text-slate-500">Report an issue or share an idea</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: value }))}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition ${
                  form.type === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <TextField
            label="Title"
            required
            maxLength={100}
            placeholder="Short summary of your feedback"
            value={form.title}
            error={errors.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <p className="mt-1 text-right text-xs text-slate-400">{titleLen} / 100</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            maxLength={2000}
            rows={4}
            placeholder="Describe the issue or idea in detail..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
              errors.description ? "border-red-300 focus:ring-red-500" : "border-slate-300 focus:ring-primary/30"
            }`}
          />
          <div className="mt-1 flex items-center justify-between">
            {errors.description ? (
              <p className="text-xs text-red-600">{errors.description}</p>
            ) : (
              <span />
            )}
            <p className="text-right text-xs text-slate-400">{descLen} / 2000</p>
          </div>
        </div>

        {form.type === "issue" && (
          <SelectField
            label="Priority"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketPriority }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </SelectField>
        )}

        <div className="rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setContactOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-700"
          >
            Contact Details
            <span className="text-xs text-slate-400">{contactOpen ? "Hide" : "Show"}</span>
          </button>
          {contactOpen && (
            <div className="space-y-3 border-t border-slate-200 p-3">
              <TextField label="Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <TextField
                label="Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <TextField label="Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              <p className="text-xs text-slate-500">We&apos;ll use this to follow up with you.</p>
            </div>
          )}
          {errors.contact && <p className="px-3 pb-2 text-xs text-red-600">{errors.contact}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createTicket.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createTicket.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {createTicket.isPending ? "Sending..." : "Send Feedback"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
