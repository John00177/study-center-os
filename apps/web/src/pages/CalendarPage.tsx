import type { CalendarSessionDto } from "@crm/shared-types";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { SessionBlock } from "../components/calendar/SessionBlock";
import { ScheduleFormModal } from "../components/calendar/ScheduleFormModal";
import { SessionDetailModal } from "../components/calendar/SessionDetailModal";
import { useBranches } from "../hooks/use-branches";
import { useCalendar } from "../hooks/use-calendar";
import { useClassrooms } from "../hooks/use-classrooms";
import { useTeachers } from "../hooks/use-teachers";
import { useUserRole } from "../stores/auth.store";
import { addDaysIso, DAY_LABELS_SHORT, formatDayHeader, formatWeekRange, getMondayIso } from "../lib/week";

const CALENDAR_START_HOUR = 8;
const CALENDAR_END_HOUR = 22;
const HOUR_HEIGHT = 60;
const HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
  (_, i) => CALENDAR_START_HOUR + i,
);
const CALENDAR_START_MINUTES = CALENDAR_START_HOUR * 60;
const CALENDAR_HEIGHT = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * HOUR_HEIGHT;

function timeToOffset(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return ((h * 60 + m - CALENDAR_START_MINUTES) / 60) * HOUR_HEIGHT;
}

function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface CreateSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function CalendarPage() {
  const role = useUserRole();
  const isTeacher = role === "teacher";

  const [weekStart, setWeekStart] = useState(() => getMondayIso(new Date()));
  const [branchId, setBranchId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [mobileDayIndex, setMobileDayIndex] = useState(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  });

  const [selectedSession, setSelectedSession] = useState<{ session: CalendarSessionDto; date: string } | null>(
    null,
  );
  const [createSlot, setCreateSlot] = useState<CreateSlot | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const { data: branches } = useBranches();
  const { data: teachers } = useTeachers();
  const { data: classrooms } = useClassrooms();

  const filters = useMemo(
    () => ({
      branchId: branchId || undefined,
      teacherId: isTeacher ? undefined : teacherId || undefined,
      classroomId: classroomId || undefined,
    }),
    [branchId, teacherId, classroomId, isTeacher],
  );

  const { data: calendar, isLoading } = useCalendar(weekStart, filters);
  const days = calendar?.days ?? [];

  function handleDayColumnClick(dayOfWeek: number, e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // ignore clicks that bubbled from a session block
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutes = CALENDAR_START_MINUTES + Math.round(offsetY / HOUR_HEIGHT) * 60;
    const startTime = minutesToTime(minutes);
    const endTime = minutesToTime(minutes + 60);
    setCreateSlot({ dayOfWeek, startTime, endTime });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Calendar</h1>
        <button
          onClick={() =>
            setCreateSlot({ dayOfWeek: mobileDayIndex === 6 ? 0 : mobileDayIndex + 1, startTime: "09:00", endTime: "10:00" })
          }
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((w) => addDaysIso(w, -7))}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[180px] text-center text-sm font-medium text-slate-700">
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={() => setWeekStart((w) => addDaysIso(w, 7))}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekStart(getMondayIso(new Date()))}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
          >
            <option value="">All branches</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {!isTeacher && (
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
            >
              <option value="">All teachers</option>
              {teachers?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
          >
            <option value="">All classrooms</option>
            {classrooms?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

      {/* Desktop / tablet grid */}
      {!isLoading && (
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
          <div className="flex min-w-[860px]">
            <div className="w-14 shrink-0 border-r border-slate-200">
              <div className="h-12 border-b border-slate-200" />
              <div className="relative" style={{ height: CALENDAR_HEIGHT }}>
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute right-1 -translate-y-1/2 text-[11px] text-slate-400"
                    style={{ top: (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT }}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {days.map((day) => (
              <div key={day.date} className="flex-1 border-r border-slate-200 last:border-r-0">
                <div className="flex h-12 flex-col items-center justify-center border-b border-slate-200 bg-slate-50">
                  <span className="text-xs font-medium text-slate-700">{formatDayHeader(day.date)}</span>
                </div>
                <div
                  className="relative cursor-pointer"
                  style={{ height: CALENDAR_HEIGHT }}
                  onClick={(e) => handleDayColumnClick(day.dayOfWeek, e)}
                >
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="pointer-events-none absolute inset-x-0 border-t border-slate-100"
                      style={{ top: (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}
                  {day.sessions.map((session) => (
                    <SessionBlock
                      key={session.id}
                      session={session}
                      onClick={() => setSelectedSession({ session, date: day.date })}
                      className="absolute inset-x-1"
                      style={{
                        top: timeToOffset(session.startTime),
                        height: Math.max(28, timeToOffset(session.endTime) - timeToOffset(session.startTime)),
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile: day tabs + list */}
      {!isLoading && (
        <div className="sm:hidden">
          <div className="mb-3 flex gap-1 overflow-x-auto">
            {DAY_LABELS_SHORT.slice(1).concat(DAY_LABELS_SHORT[0]).map((label, idx) => (
              <button
                key={label}
                onClick={() => setMobileDayIndex(idx)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  mobileDayIndex === idx ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {(days[mobileDayIndex]?.sessions.length ?? 0) === 0 && (
              <p className="text-sm text-slate-500">No sessions this day.</p>
            )}
            {days[mobileDayIndex]?.sessions.map((session) => (
              <SessionBlock
                key={session.id}
                session={session}
                onClick={() => setSelectedSession({ session, date: days[mobileDayIndex]?.date ?? weekStart })}
                className="w-full"
              />
            ))}
          </div>
        </div>
      )}

      <SessionDetailModal
        session={selectedSession?.session ?? null}
        date={selectedSession?.date ?? null}
        onClose={() => setSelectedSession(null)}
        onEdit={() => {
          if (selectedSession) {
            setEditingSessionId(selectedSession.session.id);
            setSelectedSession(null);
          }
        }}
      />

      <ScheduleFormModal
        open={Boolean(createSlot)}
        onClose={() => setCreateSlot(null)}
        initialSlot={createSlot}
      />

      <ScheduleFormModal
        open={Boolean(editingSessionId)}
        onClose={() => setEditingSessionId(null)}
        editSessionId={editingSessionId}
      />
    </div>
  );
}
