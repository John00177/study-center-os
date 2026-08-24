import { isAxiosError } from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { useSubmitTest, useTestForTaking } from "../../hooks/use-student-tests";

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TakeTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: test, isLoading, error } = useTestForTaking(id ?? null);
  const submitTest = useSubmitTest(id ?? "");

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<{ totalScore: number; status: string } | null>(null);
  const hasStartedTimer = useRef(false);

  useEffect(() => {
    if (test && !hasStartedTimer.current) {
      setSecondsLeft(test.duration * 60);
      hasStartedTimer.current = true;
    }
  }, [test]);

  useEffect(() => {
    if (secondsLeft === null || submitted) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, submitted]);

  async function handleSubmit() {
    if (!test || submitted) return;
    const payload = test.questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? "" }));
    try {
      const result = await submitTest.mutateAsync(payload);
      setSubmitted({ totalScore: result.totalScore, status: result.status });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        showToast("You have already submitted this test.", "error");
        navigate(`/student/tests/${id}/result`);
      } else {
        showToast("Failed to submit test.", "error");
      }
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (error) {
    if (isAxiosError(error) && error.response?.status === 409) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">You have already submitted this test.</p>
          <button
            onClick={() => navigate(`/student/tests/${id}/result`)}
            className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            View Results
          </button>
        </div>
      );
    }
    return <p className="text-sm text-red-600">This test isn't available.</p>;
  }

  if (!test) {
    return null;
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-bold text-slate-900">Test Submitted!</p>
        {submitted.status === "graded" ? (
          <p className="mt-2 text-lg text-slate-700">
            You scored <span className="font-bold text-indigo-600">{submitted.totalScore}</span> / {test.totalMarks}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Your objective answers are graded. Essay questions are pending teacher review.
          </p>
        )}
        <button
          onClick={() => navigate(`/student/tests/${id}/result`)}
          className="mt-6 w-full rounded-md bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          View Results
        </button>
      </div>
    );
  }

  const question = test.questions[index];
  const progress = ((index + 1) / test.questions.length) * 100;
  const isLastQuestion = index === test.questions.length - 1;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          Question {index + 1} of {test.questions.length}
        </p>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            secondsLeft !== null && secondsLeft < 60 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
          }`}
        >
          {secondsLeft !== null ? formatTime(secondsLeft) : "--:--"}
        </span>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {question.marks} {question.marks === 1 ? "mark" : "marks"}
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{question.text}</p>

        <div className="mt-4 space-y-2">
          {question.type === "multiple_choice" &&
            question.options.map((opt, i) => {
              const letter = ["A", "B", "C", "D"][i];
              return (
                <label
                  key={i}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${
                    answers[question.id] === letter ? "border-indigo-400 bg-indigo-50" : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    checked={answers[question.id] === letter}
                    onChange={() => setAnswers((a) => ({ ...a, [question.id]: letter }))}
                  />
                  {opt}
                </label>
              );
            })}

          {question.type === "true_false" &&
            ["true", "false"].map((val) => (
              <label
                key={val}
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm capitalize ${
                  answers[question.id] === val ? "border-indigo-400 bg-indigo-50" : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={answers[question.id] === val}
                  onChange={() => setAnswers((a) => ({ ...a, [question.id]: val }))}
                />
                {val}
              </label>
            ))}

          {(question.type === "fill_blank" || question.type === "short_answer") && (
            <input
              value={answers[question.id] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Type your answer"
            />
          )}

          {question.type === "essay" && (
            <textarea
              value={answers[question.id] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: e.target.value }))}
              rows={6}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Write your answer"
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex-1 rounded-md border border-slate-300 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        {isLastQuestion ? (
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex-1 rounded-md bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Submit Test
          </button>
        ) : (
          <button
            onClick={() => setIndex((i) => Math.min(test.questions.length - 1, i + 1))}
            className="flex-1 rounded-md bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Next
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit test"
        message="Are you sure you want to submit? You cannot change your answers after submitting."
        confirmLabel={submitTest.isPending ? "Submitting..." : "Submit"}
        isConfirming={submitTest.isPending}
        onConfirm={async () => {
          await handleSubmit();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
