import { useParams } from "react-router-dom";
import { useOwnTestResult } from "../../hooks/use-student-tests";
import { useTranslation } from "../../hooks/use-translation";

export function TestResultPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: result, isLoading } = useOwnTestResult(id ?? null);

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("Loading...")}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("Result not found.")}</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className={`rounded-xl p-6 text-center shadow-sm ${result.passed ? "bg-green-50" : "bg-red-50"}`}>
        <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{result.test.title}</p>
        <p className={`mt-2 text-3xl font-bold ${result.passed ? "text-green-600" : "text-red-600"}`}>
          {result.totalScore}/{result.test.totalMarks} ({result.percentage}%)
        </p>
        <span
          className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
            result.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {result.passed ? "Passed" : "Failed"}
        </span>
        {result.status === "submitted" && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("Some essay questions are still pending teacher grading.")}</p>
        )}
      </div>

      {result.feedback && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("Teacher Feedback")}</p>
          <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{result.feedback}</p>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("Question Review")}</h2>
        <div className="space-y-3">
          {result.questions.map((q, i) => (
            <div
              key={q.id}
              className={`rounded-xl border p-4 shadow-sm ${
                q.isCorrect === true ? "border-green-200 bg-green-50" : q.isCorrect === false ? "border-red-200 bg-red-50" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              }`}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Question {i + 1}: {q.text}
              </p>
              <p className="mt-1 text-sm">
                {t("Your answer:")}<span className="font-medium">{q.yourAnswer ?? "-"}</span>
              </p>
              {q.type !== "essay" && q.correctAnswer && q.isCorrect === false && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("Correct answer:")}<span className="font-medium">{q.correctAnswer}</span>
                </p>
              )}
              {q.type === "essay" && (
                <p className="text-xs italic text-slate-500 dark:text-slate-400">
                  {q.isCorrect === null ? "Pending teacher grading" : `Graded: ${q.marksObtained} / ${q.marks} marks`}
                </p>
              )}
              {q.explanation && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{q.explanation}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
