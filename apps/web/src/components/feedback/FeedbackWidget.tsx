import { useState } from "react";
import { ClipboardList, MessageCircle } from "lucide-react";
import { FeedbackModal } from "./FeedbackModal";
import { MyTicketsModal } from "./MyTicketsModal";
import { useOpenTicketCount } from "../../hooks/use-support-tickets";

interface FeedbackWidgetProps {
  basePath: string;
  profile: { name: string; email?: string | null; phone?: string | null };
}

export function FeedbackWidget({ basePath, profile }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [myTicketsOpen, setMyTicketsOpen] = useState(false);
  const openCount = useOpenTicketCount(basePath);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={() => setMyTicketsOpen(true)}
          title="My Feedback"
          aria-label="My Feedback"
          className="group flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-lg ring-1 ring-slate-200 transition-transform duration-150 hover:scale-110 hover:text-primary"
        >
          <ClipboardList className="h-4 w-4" />
          <span className="pointer-events-none absolute right-12 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            My Feedback
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Feedback & Support"
          aria-label="Feedback & Support"
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform duration-150 hover:scale-110 hover:shadow-xl"
        >
          <MessageCircle className="h-6 w-6" />
          {openCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
              {openCount}
            </span>
          )}
          <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            Feedback & Support
          </span>
        </button>
      </div>

      <FeedbackModal open={open} onClose={() => setOpen(false)} basePath={basePath} profile={profile} />
      <MyTicketsModal open={myTicketsOpen} onClose={() => setMyTicketsOpen(false)} basePath={basePath} />
    </>
  );
}
