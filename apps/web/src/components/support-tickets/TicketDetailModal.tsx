import { useEffect, useState } from "react";
import { Loader2, Mail, Phone } from "lucide-react";
import type { TicketStatus } from "@crm/shared-types";
import { Modal } from "../Modal";
import { useTicket, useUpdateTicket } from "../../hooks/use-support-tickets";
import { useToast } from "../Toast";
import {
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  TYPE_ICONS,
  TYPE_LABELS,
  formatRelativeTime,
} from "./ticket-format";

interface TicketDetailModalProps {
  open: boolean;
  onClose: () => void;
  basePath: string;
  ticketId: string | null;
  /** Platform admin can view/edit internal notes; org owners cannot. */
  showInternalNotes?: boolean;
  /** Platform admin sees which organization a ticket belongs to. */
  showOrganization?: boolean;
  /** Platform admin can write a customer-facing reply; everyone else only reads it. */
  canReply?: boolean;
}

const NEXT_STATUS_ACTIONS: { status: TicketStatus; label: string }[] = [
  { status: "in_progress", label: "Mark In Progress" },
  { status: "resolved", label: "Mark Resolved" },
  { status: "closed", label: "Close" },
];

export function TicketDetailModal({
  open,
  onClose,
  basePath,
  ticketId,
  showInternalNotes = false,
  showOrganization = false,
  canReply = false,
}: TicketDetailModalProps) {
  const { data: ticket, isLoading } = useTicket(basePath, open ? ticketId : null);
  const updateTicket = useUpdateTicket(basePath);
  const { showToast } = useToast();
  const [notes, setNotes] = useState("");
  const [reply, setReply] = useState("");

  useEffect(() => {
    setNotes(ticket?.internalNotes ?? "");
    setReply(ticket?.adminReply ?? "");
  }, [ticket?.id, ticket?.internalNotes, ticket?.adminReply]);

  async function setStatus(status: TicketStatus) {
    if (!ticket) return;
    try {
      await updateTicket.mutateAsync({ id: ticket.id, status });
      showToast(`Ticket marked ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch {
      showToast("Failed to update ticket.", "error");
    }
  }

  async function saveNotes() {
    if (!ticket) return;
    try {
      await updateTicket.mutateAsync({ id: ticket.id, internalNotes: notes });
      showToast("Internal notes saved.");
    } catch {
      showToast("Failed to save notes.", "error");
    }
  }

  async function sendReply() {
    if (!ticket || !reply.trim()) return;
    try {
      await updateTicket.mutateAsync({ id: ticket.id, adminReply: reply });
      showToast("Reply sent.");
    } catch {
      showToast("Failed to send reply.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={ticket ? ticket.title : "Ticket"} widthClassName="max-w-2xl">
      {isLoading && (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {ticket && (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {TYPE_ICONS[ticket.type]} {TYPE_LABELS[ticket.type]}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[ticket.status]}`}>
              {STATUS_LABELS[ticket.status]}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              Priority: {PRIORITY_LABELS[ticket.priority]}
            </span>
            <span className="text-xs text-slate-400">{formatRelativeTime(ticket.createdAt)}</span>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
            <p className="whitespace-pre-wrap text-slate-700">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted by</p>
              <p className="text-slate-900">{ticket.submitterName}</p>
              <p className="capitalize text-slate-500">{ticket.submitterType.replace("_", " ")}</p>
            </div>
            {showOrganization && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Organization</p>
                <p className="text-slate-900">{ticket.organizationName ?? "Platform"}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact</p>
              {ticket.contactEmail && (
                <a
                  href={`mailto:${ticket.contactEmail}`}
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {ticket.contactEmail}
                </a>
              )}
              {ticket.contactPhone && (
                <a href={`tel:${ticket.contactPhone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" />
                  {ticket.contactPhone}
                </a>
              )}
              {!ticket.contactEmail && !ticket.contactPhone && <p className="text-slate-400">No contact info</p>}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Status History</p>
            <ol className="space-y-1 border-l-2 border-slate-200 pl-3 text-xs text-slate-500">
              <li>Created {formatRelativeTime(ticket.createdAt)}</li>
              {ticket.updatedAt !== ticket.createdAt && <li>Last updated {formatRelativeTime(ticket.updatedAt)}</li>}
            </ol>
          </div>

          {!canReply && ticket.adminReply && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 dark:border-primary/30 dark:bg-primary/10">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                Admin Reply{ticket.repliedAt ? ` · ${formatRelativeTime(ticket.repliedAt)}` : ""}
              </p>
              <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">{ticket.adminReply}</p>
            </div>
          )}

          {canReply && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Reply to submitter{ticket.repliedAt ? ` (last sent ${formatRelativeTime(ticket.repliedAt)})` : ""}
              </p>
              <textarea
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply the submitter will see in their ticket..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={sendReply}
                disabled={updateTicket.isPending || !reply.trim()}
                className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                Send Reply
              </button>
            </div>
          )}

          {showInternalNotes && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Internal Notes</p>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes visible to platform admins only..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={saveNotes}
                disabled={updateTicket.isPending}
                className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Save Notes
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            {NEXT_STATUS_ACTIONS.filter((a) => a.status !== ticket.status).map(({ status, label }) => (
              <button
                key={status}
                onClick={() => setStatus(status)}
                disabled={updateTicket.isPending}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {label}
              </button>
            ))}
            {ticket.contactEmail && (
              <a
                href={`mailto:${ticket.contactEmail}?subject=${encodeURIComponent(`Re: ${ticket.title}`)}`}
                className="ml-auto rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                Reply
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
