import { Link } from "react-router-dom";
import type { ScheduleDto, TeacherGroupDto } from "@crm/shared-types";
import { useMyGroups } from "../../hooks/use-teacher-dashboard";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function nextClass(schedules: ScheduleDto[]): ScheduleDto | null {
  if (schedules.length === 0) return null;
  const today = new Date().getDay();
  return [...schedules].sort((a, b) => {
    const da = (a.dayOfWeek - today + 7) % 7;
    const db = (b.dayOfWeek - today + 7) % 7;
    if (da !== db) return da - db;
    return a.startTime.localeCompare(b.startTime);
  })[0];
}

export function TeacherGroupsPage() {
  const { data: groups, isLoading } = useMyGroups();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">My Groups</h1>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

      {!isLoading && (groups?.length ?? 0) === 0 && (
        <p className="text-sm text-slate-500">You have no assigned groups yet.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups?.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: TeacherGroupDto }) {
  const next = nextClass(group.schedules);

  return (
    <Link
      to={`/teacher/groups/${group.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <p className="font-semibold text-slate-900 dark:text-slate-100">{group.name}</p>
      <p className="mt-1 text-sm text-slate-500">{group.course?.name ?? "-"}</p>
      <p className="text-sm text-slate-500">{group.branch.name}</p>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-600">{group.studentCount} students</span>
        {next && (
          <span className="text-slate-500">
            Next: {DAY_LABELS[next.dayOfWeek]} {next.startTime}
          </span>
        )}
      </div>
    </Link>
  );
}
