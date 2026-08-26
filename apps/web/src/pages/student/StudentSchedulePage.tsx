import type { StudentScheduleSessionDto } from "@crm/shared-types";
import { useState } from "react";
import { Modal } from "../../components/Modal";
import { useStudentPortalSchedule } from "../../hooks/use-student-portal";
import { useTranslation } from "../../hooks/use-translation";

export function StudentSchedulePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentPortalSchedule();
  const [selected, setSelected] = useState<StudentScheduleSessionDto | null>(null);

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("Loading...")}</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">{t("My Schedule")}</h1>

      <div className="space-y-4">
        {(data ?? []).map((day) => (
          <div key={day.date}>
            <p className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            {day.sessions.length === 0 && (
              <p className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-400 dark:text-slate-500">{t("No classes")}</p>
            )}
            <div className="space-y-2">
              {day.sessions.map((session, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(session)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-left shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{session.groupName}</p>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {session.startTime} - {session.endTime}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{session.teacherName}</p>
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
              <p className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">{t("Time")}</p>
              <p className="text-slate-900 dark:text-slate-100">
                {selected.startTime} - {selected.endTime}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">{t("Course")}</p>
              <p className="text-slate-900 dark:text-slate-100">{selected.courseName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">{t("Teacher")}</p>
              <p className="text-slate-900 dark:text-slate-100">{selected.teacherName}</p>
              {selected.teacherPhone && <p className="text-slate-500 dark:text-slate-400">{selected.teacherPhone}</p>}
              {selected.teacherEmail && <p className="text-slate-500 dark:text-slate-400">{selected.teacherEmail}</p>}
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">{t("Location")}</p>
              <p className="text-slate-900 dark:text-slate-100">
                {selected.classroomName ?? "Classroom TBD"} · {selected.branchName}
              </p>
              {selected.branchAddress && <p className="text-slate-500 dark:text-slate-400">{selected.branchAddress}</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
