import type { CalendarSessionDto } from "@crm/shared-types";
import { getCourseColor } from "../../lib/course-color";

interface SessionBlockProps {
  session: CalendarSessionDto;
  onClick: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function SessionBlock({ session, onClick, style, className = "" }: SessionBlockProps) {
  const color = getCourseColor(session.course?.name ?? session.branch?.name ?? session.group?.id ?? "default");

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ backgroundColor: color.bg, borderColor: color.border, ...style }}
      className={`overflow-hidden rounded-lg border-l-4 p-2 text-left shadow-sm transition hover:shadow-md hover:brightness-95 ${className}`}
    >
      <p className="truncate text-xs font-semibold" style={{ color: color.text }}>
        {session.group?.name ?? "Untitled group"}
      </p>
      <p className="truncate text-[11px] text-slate-600">
        {session.startTime} - {session.endTime}
      </p>
      {session.teacher && <p className="truncate text-[11px] text-slate-500">{session.teacher.name}</p>}
      {session.classroom && (
        <span className="mt-0.5 inline-block truncate rounded bg-white/70 px-1 py-0.5 text-[10px] text-slate-500">
          {session.classroom.name}
        </span>
      )}
    </button>
  );
}
