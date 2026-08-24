import type { ParentScheduleSessionDto } from "@crm/shared-types";
import { useState } from "react";
import { Modal } from "../../components/Modal";
import { useParentSchedule } from "../../hooks/use-parent-portal";

export function ParentSchedulePage() {
  const { data, isLoading } = useParentSchedule();
  const [selected, setSelected] = useState<ParentScheduleSessionDto | null>(null);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Weekly Schedule</h1>

      <div className="space-y-4">
        {(data ?? []).map((day) => (
          <div key={day.date}>
            <p className="mb-2 text-sm font-semibold text-slate-500">
              {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            {day.sessions.length === 0 && (
              <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-400">No classes</p>
            )}
            <div className="space-y-2">
              {day.sessions.map((session, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(session)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{session.groupName}</p>
                    <span className="text-sm text-slate-500">
                      {session.startTime} - {session.endTime}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{session.teacherName}</p>
                  <p className="text-xs text-slate-400">
                    {session.classroomName ?? "Classroom TBD"} · {session.branchName}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.groupName ?? "Class"}>
        {selected && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Time</p>
              <p className="text-slate-900">
                {selected.startTime} - {selected.endTime}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Course</p>
              <p className="text-slate-900">{selected.courseName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Teacher</p>
              <p className="text-slate-900">{selected.teacherName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Location</p>
              <p className="text-slate-900">
                {selected.classroomName ?? "Classroom TBD"} · {selected.branchName}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
