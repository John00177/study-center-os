import { useState } from "react";
import { ClipboardList, MessageCircle } from "lucide-react";
import { FeedbackModal } from "./FeedbackModal";
import { MyTicketsModal } from "./MyTicketsModal";
import { useOpenTicketCount } from "../../hooks/use-support-tickets";
import { useTranslation } from "../../hooks/use-translation";

interface FeedbackWidgetProps {
  basePath: string;
  profile: { name: string; email?: string | null; phone?: string | null };
}

export function FeedbackWidget({ basePath, profile }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [myTicketsOpen, setMyTicketsOpen] = useState(false);
  const openCount = useOpenTicketCount(basePath);
  const { t } = useTranslation();

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {/* The open-ticket count belongs here, not on the compose button below —
            it counts tickets shown in this list, so a badge on the "write a new
            ticket" button pointed users at a blank form instead of their tickets. */}
        <button
          type="button"
          onClick={() => setMyTicketsOpen(true)}
          title={t("My Feedback")}
          aria-label={t("My Feedback")}
          className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-lg ring-1 ring-slate-200 transition-transform duration-150 hover:scale-110 hover:text-primary"
        >
          <ClipboardList className="h-4 w-4" />
          {openCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
              {openCount}
            </span>
          )}
          <span className="pointer-events-none absolute right-12 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {t("My Feedback")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          title={t("feedbackAndSupport")}
          aria-label={t("feedbackAndSupport")}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform duration-150 hover:scale-110 hover:shadow-xl"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {t("feedbackAndSupport")}
          </span>
        </button>
      </div>

      <FeedbackModal open={open} onClose={() => setOpen(false)} basePath={basePath} profile={profile} />
      <MyTicketsModal open={myTicketsOpen} onClose={() => setMyTicketsOpen(false)} basePath={basePath} />
    </>
  );
}
