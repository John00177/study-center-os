import type { HomeworkSubmissionDto, SubmissionStatus } from "@crm/shared-types";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DataTable } from "../DataTable";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { useGradeSubmission, useHomeworkDetail } from "../../hooks/use-homework";

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  graded: "bg-green-100 text-green-700",
  late: "bg-red-100 text-red-700",
};

interface HomeworkDetailModalProps {
  open: boolean;
  onClose: () => void;
  homeworkId: string | null;
}

function GradeRow({ submission }: { submission: HomeworkSubmissionDto }) {
  const gradeSubmission = useGradeSubmission();
  const { showToast } = useToast();
  const [score, setScore] = useState(submission.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");

  async function handleGrade() {
    const numericScore = Number(score);
    if (!score || Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      showToast("Enter a score between 0 and 100.", "error");
      return;
    }
    try {
      await gradeSubmission.mutateAsync({ submissionId: submission.id, score: numericScore, feedback: feedback.trim() || undefined });
      showToast("Submission graded.");
    } catch {
      showToast("Failed to grade submission.", "error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={0}
        max={100}
        value={score}
        onChange={(e) => setScore(e.target.value)}
        placeholder="Score"
        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <input
        type="text"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Feedback"
        className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <button
        type="button"
        onClick={handleGrade}
        disabled={gradeSubmission.isPending}
        className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {gradeSubmission.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        Grade
      </button>
    </div>
  );
}

export function HomeworkDetailModal({ open, onClose, homeworkId }: HomeworkDetailModalProps) {
  const { data: homework, isLoading } = useHomeworkDetail(open ? homeworkId : null);

  const submissions = homework?.submissions ?? [];
  const total = submissions.length;
  const submittedCount = submissions.filter((s) => s.status === "submitted" || s.status === "graded" || s.status === "late").length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;
  const submittedPct = total > 0 ? Math.round((submittedCount / total) * 100) : 0;
  const gradedPct = total > 0 ? Math.round((gradedCount / total) * 100) : 0;

  return (
    <Modal open={open} onClose={onClose} title={homework?.title ?? "Homework"} widthClassName="max-w-2xl">
      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {homework && (
        <div>
          {homework.description && <p className="mb-2 text-sm text-slate-600">{homework.description}</p>}
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Due {new Date(homework.dueDate).toLocaleDateString()}</span>
            <span>Teacher: {homework.teacher?.name ?? "-"}</span>
            {homework.lesson && <span>Lesson: {homework.lesson.title}</span>}
          </div>

          <div className="mb-4 space-y-2">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Submitted</span>
                <span>{submittedPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-blue-500" style={{ width: `${submittedPct}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Graded</span>
                <span>{gradedPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-green-500" style={{ width: `${gradedPct}%` }} />
              </div>
            </div>
          </div>

          <DataTable
            data={submissions}
            isLoading={false}
            emptyMessage="No students enrolled."
            getRowKey={(s) => s.id}
            columns={[
              { header: "Student", render: (s) => s.student?.name ?? "-" },
              {
                header: "Status",
                render: (s) => (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[s.status]}`}>
                    {s.status}
                  </span>
                ),
              },
              { header: "Submitted", render: (s) => (s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : "-") },
              { header: "Score", render: (s) => (s.score !== null && s.score !== undefined ? s.score : "-") },
              { header: "Grade", render: (s) => <GradeRow submission={s} /> },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
