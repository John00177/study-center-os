import type { TestResultRowDto } from "@crm/shared-types";
import { ArrowLeft, Eye, GraduationCap } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link, useParams } from "react-router-dom";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { TextField } from "../../components/form/Field";
import { useToast } from "../../components/Toast";
import { useGradeEssay, useSubmissionDetail, useTest, useTestResults } from "../../hooks/use-ai-test-generator";
import { useTranslation } from "../../hooks/use-translation";

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function SubmissionDetailModal({
  testId,
  row,
  onClose,
}: {
  testId: string;
  row: TestResultRowDto | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: detail, isLoading } = useSubmissionDetail(testId, row?.submissionId ?? null);
  const gradeEssay = useGradeEssay(testId);
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts({});
  }, [row?.submissionId]);

  async function handleGrade(questionId: string, e: FormEvent) {
    e.preventDefault();
    const marks = Number(drafts[questionId] ?? 0);
    try {
      await gradeEssay.mutateAsync({ submissionId: row!.submissionId, questionId, marksObtained: marks });
      showToast(t("Essay graded."));
    } catch {
      showToast(t("Failed to grade essay."), "error");
    }
  }

  return (
    <Modal open={Boolean(row)} onClose={onClose} title={detail?.student?.name ? `${detail.student.name}'s Answers` : "Answers"} widthClassName="max-w-2xl">
      {isLoading || !detail ? (
        <p className="text-sm text-slate-500">{t("Loading...")}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {t("Score:")}<span className="font-semibold">{detail.totalScore}</span> / {detail.totalMarks} ({detail.percentage}%)
          </p>
          {detail.questions.map((q, i) => (
            <div key={q.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Question {i + 1}: {q.text}
              </p>
              <p className="mt-1 text-sm">
                Your answer:{" "}
                <span className={q.isCorrect === true ? "font-medium text-green-700" : q.isCorrect === false ? "font-medium text-red-700" : "text-slate-700"}>
                  {q.yourAnswer ?? "-"}
                </span>
              </p>
              {q.type !== "essay" && <p className="text-xs text-slate-500">Correct answer: {q.correctAnswer}</p>}
              {q.explanation && <p className="mt-1 text-xs text-slate-400">{q.explanation}</p>}

              {q.type === "essay" && q.isCorrect === null && (
                <form onSubmit={(e) => handleGrade(q.id, e)} className="mt-2 flex items-end gap-2">
                  <div className="w-28">
                    <TextField
                      label={`Marks (max ${q.marks})`}
                      type="number"
                      min="0"
                      max={q.marks}
                      value={drafts[q.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={gradeEssay.isPending}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {t("Grade")}
                  </button>
                </form>
              )}
              {q.type === "essay" && q.isCorrect !== null && (
                <p className="mt-1 text-xs font-medium text-green-700">Graded: {q.marksObtained} / {q.marks} marks</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function TestResultsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: test } = useTest(id ?? null);
  const { data: results, isLoading } = useTestResults(id ?? null);
  const [viewingRow, setViewingRow] = useState<TestResultRowDto | null>(null);

  const chartData =
    results?.questionAnalytics.map((q, i) => ({
      name: `Q${i + 1}`,
      value: q.correctPercentage,
      text: q.text,
    })) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/teacher/ai-tests" className="mb-1 flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            <ArrowLeft className="h-4 w-4" />
            {t("Back to My Tests")}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{test?.title ?? "Test Results"}</h1>
        </div>
      </div>

      {isLoading || !results ? (
        <p className="text-sm text-slate-500">{t("Loading...")}</p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label={t("Total Students")} value={results.summary.totalStudents} />
            <SummaryCard label={t("Submitted")} value={results.summary.submittedCount} />
            <SummaryCard label={t("Not Submitted")} value={results.summary.notSubmittedCount} />
            <SummaryCard label={t("Average Score")} value={`${results.summary.averageScore}%`} />
            <SummaryCard label={t("Pass Rate")} value={`${results.summary.passRate}%`} />
          </div>

          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Submissions")}</h2>
            <DataTable
              data={results.rows}
              isLoading={false}
              emptyMessage={t("No submissions yet.")}
              getRowKey={(r) => r.submissionId}
              columns={[
                { header: t("Student"), render: (r) => r.student?.name ?? "Unknown" },
                { header: t("Score"), render: (r) => `${r.totalScore} / ${r.totalMarks}` },
                { header: t("Percentage"), render: (r) => `${r.percentage}%` },
                {
                  header: t("Status"),
                  render: (r) => (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.passed ? "Passed" : "Failed"}
                    </span>
                  ),
                },
                { header: t("Submitted At"), render: (r) => (r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "-") },
              ]}
              renderActions={(r) => (
                <>
                  <button onClick={() => setViewingRow(r)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={t("View answers")} title={t("View Answers")}>
                    <Eye className="h-4 w-4" />
                  </button>
                  {r.hasPendingEssay && (
                    <button
                      onClick={() => setViewingRow(r)}
                      className="rounded p-1.5 text-orange-500 hover:bg-orange-50"
                      aria-label={t("Grade essay")}
                      title={t("Grade Essay (pending)")}
                    >
                      <GraduationCap className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("Per-Question Analytics")}</h2>
            <p className="mb-2 text-xs text-slate-400">Red bars mark questions where fewer than half the class answered correctly — worth reteaching.</p>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {chartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">{t("No auto-graded questions to analyze.")}</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip
                      formatter={(value) => [`${value}% correct`, ""]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.text ?? label}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.value < 50 ? "#ef4444" : "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}

      <SubmissionDetailModal testId={id ?? ""} row={viewingRow} onClose={() => setViewingRow(null)} />
    </div>
  );
}
