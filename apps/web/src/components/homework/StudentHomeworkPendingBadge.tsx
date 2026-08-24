import { useStudentHomework } from "../../hooks/use-homework";

export function StudentHomeworkPendingBadge({ studentId }: { studentId: string }) {
  const { data, isLoading } = useStudentHomework(studentId);
  if (isLoading) return <span className="text-slate-400">-</span>;

  const pending = (data ?? []).filter((h) => h.submissionStatus === "pending" || h.submissionStatus === "late").length;
  if (pending === 0) return <span className="text-slate-400">0</span>;

  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      {pending} pending
    </span>
  );
}
