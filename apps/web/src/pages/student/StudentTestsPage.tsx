import { Link } from "react-router-dom";
import { useAvailableTests } from "../../hooks/use-student-tests";

export function StudentTestsPage() {
  const { data, isLoading } = useAvailableTests();

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">My Tests</h1>

      {(data ?? []).length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No tests available right now. Check back later!
        </p>
      )}

      <div className="space-y-3">
        {data?.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-medium text-slate-900">{t.title}</p>
            <p className="mt-1 text-sm text-slate-500">
              {t.subject} · {t.level}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>{t.duration} min</span>
              <span>{t.questionCount} questions</span>
              <span>{t.totalMarks} marks</span>
            </div>
            <Link
              to={`/student/tests/${t.id}/take`}
              className="mt-3 block w-full rounded-md bg-indigo-600 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start Test
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
