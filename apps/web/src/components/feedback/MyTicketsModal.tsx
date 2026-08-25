import { Modal } from "../Modal";
import { useMyTickets } from "../../hooks/use-support-tickets";
import { STATUS_BADGE_CLASSES, STATUS_LABELS, TYPE_ICONS, TYPE_LABELS, formatRelativeTime } from "../support-tickets/ticket-format";
import { BrandedSpinner } from "../branding/BrandedSpinner";

interface MyTicketsModalProps {
  open: boolean;
  onClose: () => void;
  basePath: string;
}

export function MyTicketsModal({ open, onClose, basePath }: MyTicketsModalProps) {
  const { data: tickets, isLoading } = useMyTickets(basePath, open);

  return (
    <Modal open={open} onClose={onClose} title="My Feedback" widthClassName="max-w-lg">
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <BrandedSpinner className="h-5 w-5" />
        </div>
      )}
      {!isLoading && (!tickets || tickets.length === 0) && (
        <p className="py-8 text-center text-sm text-slate-500">You haven&apos;t submitted any feedback yet.</p>
      )}
      {!isLoading && tickets && tickets.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {tickets.map((t) => (
            <li key={t.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {TYPE_ICONS[t.type]} {t.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {TYPE_LABELS[t.type]} &middot; {formatRelativeTime(t.createdAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[t.status]}`}
                >
                  {STATUS_LABELS[t.status]}
                </span>
              </div>
              {t.adminReply && (
                <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Admin Reply{t.repliedAt ? ` · ${formatRelativeTime(t.repliedAt)}` : ""}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{t.adminReply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
