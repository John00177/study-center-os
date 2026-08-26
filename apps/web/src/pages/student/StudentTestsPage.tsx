import { Link } from "react-router-dom";
import { useAvailableTests } from "../../hooks/use-student-tests";
import { useTranslation } from "../../hooks/use-translation";

export function StudentTestsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAvailableTests();

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("Loading...")}</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">{t("My Tests")}</h1>

      {(data ?? []).length === 0 && (
        <p className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
          {t("No tests available right now. Check back later!")}
        </p>
      )}

      <div className="space-y-3">
        {data?.map((test) => (
          <div key={test.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <p className="font-medium text-slate-900 dark:text-slate-100">{test.title}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {test.subject} · {test.level}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400 dark:text-slate-500">
              <span>{test.duration} min</span>
              <span>{test.questionCount} questions</span>
              <span>{test.totalMarks} marks</span>
            </div>
            <Link
              to={`/student/tests/${test.id}/take`}
              className="mt-3 block w-full rounded-md bg-indigo-600 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t("Start Test")}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
