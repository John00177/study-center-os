import type { QuestionType, TestDto, TestStatus } from "@crm/shared-types";
import { BarChart3, Eye, Lock, Pencil, Send, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { SelectField, TextField } from "../../components/form/Field";
import { useMyGroups } from "../../hooks/use-teacher-dashboard";
import { useCloseTest, useDeleteTest, usePublishTest, useTest, useTests } from "../../hooks/use-ai-test-generator";
import { useTranslation } from "../../hooks/use-translation";

const SUBJECTS = ["IELTS", "General English", "Mathematics", "Science", "Other"];

const STATUS_STYLES: Record<TestStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-500",
};

const TYPE_BADGE_STYLES: Record<QuestionType, string> = {
  multiple_choice: "bg-blue-100 text-blue-700",
  fill_blank: "bg-purple-100 text-purple-700",
  true_false: "bg-green-100 text-green-700",
  short_answer: "bg-orange-100 text-orange-700",
  essay: "bg-slate-100 text-slate-600",
};
const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  fill_blank: "Fill in Blank",
  true_false: "True/False",
  short_answer: "Short Answer",
  essay: "Essay",
};

function TestPreviewModal({ testId, onClose }: { testId: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: test, isLoading } = useTest(testId);

  return (
    <Modal open={Boolean(testId)} onClose={onClose} title={test?.title ?? "Test"} widthClassName="max-w-2xl">
      {isLoading || !test ? (
        <p className="text-sm text-slate-500">{t("Loading...")}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{test.subject}</span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{test.level}</span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{test.duration} min</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[test.status]}`}>
              {test.status}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {t("Total Marks:")}<span className="font-semibold">{test.totalMarks}</span> · Pass Marks:{" "}
            <span className="font-semibold">{test.passMarks}</span>
          </p>

          <div className="space-y-3">
            {test.questions?.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Question {i + 1}: {q.text}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_STYLES[q.type]}`}>
                    {TYPE_LABELS[q.type]}
                  </span>
                  <span className="text-xs text-slate-500">Marks: {q.marks}</span>
                </div>
                {q.type === "multiple_choice" && (
                  <ul className="mt-2 space-y-1">
                    {q.options.map((opt, j) => {
                      const letter = ["A", "B", "C", "D"][j];
                      const isCorrect = letter === q.correctAnswer;
                      return (
                        <li key={j} className={`rounded-md px-2 py-1 text-sm ${isCorrect ? "bg-green-50 font-medium text-green-700" : "text-slate-700"}`}>
                          {opt}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {(q.type === "fill_blank" || q.type === "short_answer") && (
                  <p className="mt-2 rounded-md bg-green-50 px-2 py-1 text-sm font-medium text-green-700">Answer: {q.correctAnswer}</p>
                )}
                {q.type === "true_false" && (
                  <p className="mt-2 rounded-md bg-green-50 px-2 py-1 text-sm font-medium capitalize text-green-700">
                    Correct answer: {q.correctAnswer}
                  </p>
                )}
                {q.type === "essay" && <p className="mt-2 text-sm italic text-slate-500">{t("Teacher will grade manually.")}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function PublishModal({ test, onClose }: { test: TestDto | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: groups } = useMyGroups();
  const [groupId, setGroupId] = useState("");
  const publish = usePublishTest();
  const { showToast } = useToast();

  async function handlePublish() {
    if (!test || !groupId) return;
    try {
      await publish.mutateAsync({ id: test.id, groupId });
      showToast(t("Test published to group."));
      onClose();
    } catch {
      showToast(t("Failed to publish test."), "error");
    }
  }

  return (
    <Modal open={Boolean(test)} onClose={onClose} title={t("Publish to Group")} widthClassName="max-w-sm">
      {test && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Publish "<span className="font-medium text-slate-900 dark:text-slate-100">{test.title}</span>" to a group. Students will be able to take it immediately.
          </p>
          <SelectField label={t("Group")} required value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">{t("Select group")}</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </SelectField>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {t("Cancel")}
            </button>
            <button
              onClick={handlePublish}
              disabled={!groupId || publish.isPending}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {t("Publish")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function MyTestsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [status, setStatus] = useState<TestStatus | "">("");
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useTests({ status, subject: subject || undefined, search: search || undefined });
  const deleteTest = useDeleteTest();
  const closeTest = useCloseTest();
  const [deleting, setDeleting] = useState<TestDto | null>(null);
  const [closing, setClosing] = useState<TestDto | null>(null);
  const [publishing, setPublishing] = useState<TestDto | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteTest.mutateAsync(deleting.id);
      showToast(t("Test deleted."));
      setDeleting(null);
    } catch {
      showToast(t("Failed to delete test."), "error");
    }
  }

  async function confirmClose() {
    if (!closing) return;
    try {
      await closeTest.mutateAsync(closing.id);
      showToast(t("Test closed. Students can no longer submit."));
      setClosing(null);
    } catch {
      showToast(t("Failed to close test."), "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("My Tests")}</h1>
        <Link
          to="/teacher/ai-tests/generate"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          {t("New Test")}
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-48">
          <TextField label={t("Search")} placeholder={t("Topic or title...")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-40">
          <SelectField label={t("Status")} value={status} onChange={(e) => setStatus(e.target.value as TestStatus | "")}>
            <option value="">{t("All")}</option>
            <option value="draft">{t("Draft")}</option>
            <option value="published">{t("Published")}</option>
            <option value="closed">{t("Closed")}</option>
          </SelectField>
        </div>
        <div className="w-48">
          <SelectField label={t("Subject")} value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">{t("All")}</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <DataTable
        data={data}
        isLoading={isLoading}
        emptyMessage={t("No tests yet. Create your first AI-generated test!")}
        getRowKey={(test) => test.id}
        onRowClick={(test) => setPreviewingId(test.id)}
        columns={[
          { header: t("Title"), render: (test) => <span className="font-medium text-slate-900 dark:text-slate-100">{test.title}</span> },
          { header: t("Topic"), render: (test) => test.topic },
          { header: t("Subject"), render: (test) => <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{test.subject}</span> },
          { header: t("Level"), render: (test) => <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{test.level}</span> },
          { header: t("Questions"), render: (test) => test.questionCount, align: "right" },
          { header: t("Group"), render: (test) => test.group?.name ?? "-" },
          {
            header: t("Status"),
            render: (test) => (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[test.status]}`}>
                {test.status}
              </span>
            ),
          },
          { header: t("Submissions"), render: (test) => test.submissionCount, align: "right" },
          { header: t("Avg Score"), render: (test) => (test.averageScore != null ? `${test.averageScore}%` : "-"), align: "right" },
          { header: t("Created"), render: (test) => new Date(test.createdAt).toLocaleDateString() },
        ]}
        renderActions={(test) => (
          <>
            <button onClick={() => setPreviewingId(test.id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={t("View test")} title={t("View")}>
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPreviewingId(test.id)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={t("Edit test")}
              title={t("Edit")}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {test.status === "draft" && (
              <button onClick={() => setPublishing(test)} className="rounded p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600" aria-label={t("Publish test")} title={t("Publish")}>
                <Send className="h-4 w-4" />
              </button>
            )}
            {test.status === "published" && (
              <button onClick={() => setClosing(test)} className="rounded p-1.5 text-slate-400 hover:bg-orange-50 hover:text-orange-600" aria-label={t("Close test")} title={t("Close")}>
                <Lock className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => navigate(`/teacher/ai-tests/${test.id}/results`)}
              className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
              aria-label={t("View results")}
              title={t("Results")}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button onClick={() => setDeleting(test)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={t("Delete test")} title={t("Delete")}>
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <TestPreviewModal testId={previewingId} onClose={() => setPreviewingId(null)} />
      <PublishModal test={publishing} onClose={() => setPublishing(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("Delete test")}
        message={`Are you sure you want to delete "${deleting?.title}"? This cannot be undone.`}
        confirmLabel={t("Delete")}
        isConfirming={deleteTest.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={Boolean(closing)}
        title={t("Close test")}
        message={`Close "${closing?.title}"? Students will no longer be able to submit answers.`}
        confirmLabel={t("Close")}
        isConfirming={closeTest.isPending}
        onConfirm={confirmClose}
        onCancel={() => setClosing(null)}
      />
    </div>
  );
}
