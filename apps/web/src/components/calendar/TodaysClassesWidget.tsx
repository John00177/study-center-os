import type { CalendarSessionDto } from "@crm/shared-types";
import { CalendarClock } from "lucide-react";

interface TodaysClassesWidgetProps {
  dateLabel: string;
  sessions: CalendarSessionDto[] | undefined;
  isLoading: boolean;
  onSessionClick: (session: CalendarSessionDto) => void;
  showBranch?: boolean;
}

export function TodaysClassesWidget({
  dateLabel,
  sessions,
  isLoading,
  onSessionClick,
  showBranch = false,
}: TodaysClassesWidgetProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
        <CalendarClock className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">Today's Classes — {dateLabel}</h2>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading && <p className="px-5 py-4 text-sm text-slate-500">Loading...</p>}
        {!isLoading && (sessions?.length ?? 0) === 0 && (
          <p className="px-5 py-4 text-sm text-slate-500">No classes scheduled for today.</p>
        )}
        {sessions?.map((session) => (
          <button
            key={session.id}
            onClick={() => onSessionClick(session)}
            className="flex w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-slate-50"
          >
            <div>
              <p className="font-medium text-slate-900">{session.group?.name ?? "-"}</p>
              <p className="text-slate-500">
                {session.startTime} - {session.endTime}
                {session.classroom ? ` · ${session.classroom.name}` : ""}
                {showBranch && session.branch ? ` · ${session.branch.name}` : ""}
              </p>
            </div>
            <span className="text-xs text-slate-400">{session.studentCount} students</span>
          </button>
        ))}
      </div>
    </div>
  );
}
