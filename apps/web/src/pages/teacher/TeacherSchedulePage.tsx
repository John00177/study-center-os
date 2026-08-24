import { DataTable } from "../../components/DataTable";
import { useMyGroups } from "../../hooks/use-teacher-dashboard";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ScheduleRow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  groupName: string;
}

export function TeacherSchedulePage() {
  const { data: groups, isLoading } = useMyGroups();

  const rows: ScheduleRow[] = (groups ?? [])
    .flatMap((group) =>
      group.schedules.map((schedule) => ({
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        groupName: group.name,
      })),
    )
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">My Schedule</h1>

      <DataTable
        data={rows}
        isLoading={isLoading}
        emptyMessage="No scheduled classes."
        getRowKey={(r) => r.id}
        columns={[
          { header: "Day", render: (r) => DAY_LABELS[r.dayOfWeek] },
          { header: "Time", render: (r) => `${r.startTime} - ${r.endTime}` },
          { header: "Group", render: (r) => r.groupName },
        ]}
      />
    </div>
  );
}
