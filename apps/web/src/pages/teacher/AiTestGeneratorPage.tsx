import type { GeneratedQuestionDto, QuestionType, TestLanguage } from "@crm/shared-types";
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { SelectField, TextField } from "../../components/form/Field";
import { useMyGroups } from "../../hooks/use-teacher-dashboard";
import { useGenerateTest, useSaveTest, useTestSummary } from "../../hooks/use-ai-test-generator";
import { useCurrentSubscription } from "../../hooks/use-subscription";
import { LockedFeaturePage } from "../../components/subscription/LockedFeaturePage";
import { parsePlanLockError } from "../../lib/plan-lock";

const SUBJECTS = ["IELTS", "General English", "Mathematics", "Science", "Other"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const LANGUAGES: { value: TestLanguage; label: string }[] = [
  { value: "uz", label: "Uzbek" },
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
];

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "fill_blank", label: "Fill in Blank" },
  { value: "true_false", label: "True/False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "essay", label: "Essay" },
];

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

interface EditableTest {
  title: string;
  topic: string;
  subject: string;
  level: string;
  duration: number;
  language: TestLanguage;
  groupId: string;
  questions: GeneratedQuestionDto[];
}

function QuestionEditorModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (q: GeneratedQuestionDto) => void;
  initial: GeneratedQuestionDto | null;
}) {
  const [type, setType] = useState<QuestionType>(initial?.type ?? "multiple_choice");
  const [text, setText] = useState(initial?.text ?? "");
  const [options, setOptions] = useState<string[]>(initial?.options?.length ? initial.options : ["A. ", "B. ", "C. ", "D. "]);
  const [correctAnswer, setCorrectAnswer] = useState(initial?.correctAnswer ?? "");
  const [marks, setMarks] = useState(initial?.marks ?? 1);
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");

  function reset() {
    setType(initial?.type ?? "multiple_choice");
    setText(initial?.text ?? "");
    setOptions(initial?.options?.length ? initial.options : ["A. ", "B. ", "C. ", "D. "]);
    setCorrectAnswer(initial?.correctAnswer ?? "");
    setMarks(initial?.marks ?? 1);
    setExplanation(initial?.explanation ?? "");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({
      type,
      text,
      options: type === "multiple_choice" ? options : [],
      correctAnswer: type === "essay" ? null : correctAnswer || null,
      marks,
      explanation: explanation || null,
      order: initial?.order ?? 0,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={initial ? "Edit Question" : "Add Question"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField label="Type" required value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Question Text</label>
          <textarea
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {type === "multiple_choice" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Options</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              ))}
            </div>
          </div>
        )}

        {type === "multiple_choice" ? (
          <SelectField label="Correct Answer" required value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
            <option value="">Select correct option</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </SelectField>
        ) : type === "true_false" ? (
          <SelectField label="Correct Answer" required value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
            <option value="">Select correct answer</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </SelectField>
        ) : type !== "essay" ? (
          <TextField label="Correct Answer" required value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
        ) : (
          <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-500">
            Essay questions have no fixed correct answer — the teacher grades these manually.
          </p>
        )}

        <TextField
          label="Marks"
          type="number"
          min="1"
          required
          value={marks}
          onChange={(e) => setMarks(Number(e.target.value))}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Explanation (optional)</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Save Question
          </button>
        </div>
      </form>
    </Modal>
  );
}

function QuestionCard({
  question,
  index,
  editable,
  onEdit,
  onDelete,
}: {
  question: GeneratedQuestionDto;
  index: number;
  editable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-900 dark:text-slate-100">
          Question {index + 1}: {question.text}
        </p>
        {editable && (
          <div className="flex shrink-0 gap-1">
            <button onClick={onEdit} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit question">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete question">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_STYLES[question.type]}`}>
          {TYPE_LABELS[question.type]}
        </span>
        <span className="text-xs text-slate-500">Marks: {question.marks}</span>
      </div>

      {question.type === "multiple_choice" && (
        <ul className="mt-3 space-y-1">
          {question.options.map((opt, i) => {
            const letter = ["A", "B", "C", "D"][i];
            const isCorrect = letter === question.correctAnswer;
            return (
              <li
                key={i}
                className={`rounded-md px-2 py-1 text-sm ${isCorrect ? "bg-green-50 font-medium text-green-700" : "text-slate-700"}`}
              >
                {opt}
              </li>
            );
          })}
        </ul>
      )}
      {(question.type === "fill_blank" || question.type === "short_answer") && (
        <p className="mt-3 rounded-md bg-green-50 px-2 py-1 text-sm font-medium text-green-700">
          Answer: {question.correctAnswer}
        </p>
      )}
      {question.type === "true_false" && (
        <p className="mt-3 rounded-md bg-green-50 px-2 py-1 text-sm font-medium capitalize text-green-700">
          Correct answer: {question.correctAnswer}
        </p>
      )}
      {question.type === "essay" && <p className="mt-3 text-sm italic text-slate-500">Teacher will grade manually.</p>}

      {question.explanation && <p className="mt-2 text-xs text-slate-400">{question.explanation}</p>}
    </div>
  );
}

export function AiTestGeneratorPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: groups } = useMyGroups();
  const generate = useGenerateTest();
  const save = useSaveTest();
  const probe = useTestSummary();
  const lockInfo = parsePlanLockError(probe.error);
  const { data: currentSub } = useCurrentSubscription(Boolean(lockInfo));

  const [form, setForm] = useState({
    topic: "",
    subject: SUBJECTS[0],
    level: LEVELS[1],
    questionCount: 20,
    duration: 45,
    language: "uz" as TestLanguage,
    groupId: "",
    types: new Set<QuestionType>(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [test, setTest] = useState<EditableTest | null>(null);
  const [questionsEditable, setQuestionsEditable] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function toggleType(type: QuestionType) {
    setForm((f) => {
      const next = new Set(f.types);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { ...f, types: next };
    });
  }

  async function runGenerate() {
    const nextErrors: Record<string, string> = {};
    if (!form.topic.trim()) nextErrors.topic = "Topic is required.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    try {
      const result = await generate.mutateAsync({
        topic: form.topic.trim(),
        subject: form.subject,
        level: form.level,
        questionCount: form.questionCount,
        types: form.types.size > 0 ? [...form.types] : undefined,
        duration: form.duration,
        language: form.language,
      });
      setTest({
        title: result.title,
        topic: result.topic,
        subject: result.subject,
        level: result.level,
        duration: result.duration,
        language: result.language,
        groupId: form.groupId,
        questions: result.questions,
      });
      setQuestionsEditable(false);
    } catch {
      showToast("Failed to generate test.", "error");
    }
  }

  async function handleGenerateSubmit(e: FormEvent) {
    e.preventDefault();
    await runGenerate();
  }

  const totalMarks = useMemo(() => test?.questions.reduce((sum, q) => sum + q.marks, 0) ?? 0, [test]);
  const passMarks = Math.round(totalMarks * 0.6);

  async function handleSaveTest() {
    if (!test) return;
    try {
      const saved = await save.mutateAsync({
        title: test.title,
        topic: test.topic,
        subject: test.subject,
        level: test.level,
        duration: test.duration,
        totalMarks,
        passMarks,
        groupId: test.groupId || undefined,
        status: "draft",
        questions: test.questions.map((q, i) => ({
          type: q.type,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer ?? undefined,
          marks: q.marks,
          explanation: q.explanation ?? undefined,
          order: i + 1,
        })),
      });
      showToast("Test saved.");
      navigate(`/teacher/ai-tests`);
      void saved;
    } catch {
      showToast("Failed to save test.", "error");
    }
  }

  function openAddQuestion() {
    setEditingIndex(null);
    setEditorOpen(true);
  }
  function openEditQuestion(index: number) {
    setEditingIndex(index);
    setEditorOpen(true);
  }
  function handleQuestionSave(q: GeneratedQuestionDto) {
    setTest((t) => {
      if (!t) return t;
      if (editingIndex === null) {
        return { ...t, questions: [...t.questions, { ...q, order: t.questions.length + 1 }] };
      }
      return { ...t, questions: t.questions.map((existing, i) => (i === editingIndex ? q : existing)) };
    });
  }
  function deleteQuestion(index: number) {
    setTest((t) => (t ? { ...t, questions: t.questions.filter((_, i) => i !== index) } : t));
  }

  if (lockInfo) {
    return (
      <LockedFeaturePage featureName="AI Test Generator" requiredPlan={lockInfo.requiredPlan} currentPlan={currentSub?.plan.slug} />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">AI Test Generator</h1>
          <p className="text-sm text-slate-500">Generate a complete test with AI in seconds.</p>
        </div>
        <Link to="/teacher/ai-tests" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          My Tests →
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          <TextField
            label="Topic"
            required
            placeholder="e.g., Present Perfect Tense"
            value={form.topic}
            error={errors.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField label="Subject" required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
            <SelectField label="Level" required value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Number of Questions <span className="ml-0.5 text-red-500">*</span>
              <span className="ml-2 font-normal text-slate-500">{form.questionCount}</span>
            </label>
            <input
              type="range"
              min={5}
              max={50}
              value={form.questionCount}
              onChange={(e) => setForm((f) => ({ ...f, questionCount: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>5</span>
              <span>50</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Question Types</label>
            <div className="flex flex-wrap gap-3">
              {TYPE_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.types.has(o.value)} onChange={() => toggleType(o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">Leave unchecked to use the default mix (60% MC, 20% fill-in, 10% true/false, 10% short answer).</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Duration (minutes)"
              type="number"
              min="1"
              required
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
            />
            <SelectField label="Language" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as TestLanguage }))}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </SelectField>
          </div>

          <SelectField label="Group (optional)" value={form.groupId} onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}>
            <option value="">Save without assigning</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </SelectField>

          <button
            type="submit"
            disabled={generate.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-3 text-base font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {generate.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Generate Test with AI
          </button>
          {generate.isPending && (
            <p className="text-center text-sm text-slate-500">
              AI is generating your test<span className="inline-block animate-pulse">...</span>
            </p>
          )}
        </form>
      </div>

      {test && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                <Sparkles className="h-3 w-3" />
                AI Generated
              </span>
            </div>
            <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
              {test.topic} — {test.level} Test ({test.questions.length} questions, {test.duration} min)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Total Marks: <span className="font-semibold">{totalMarks}</span> · Pass Marks:{" "}
              <span className="font-semibold">{passMarks}</span> (60%)
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleSaveTest}
                disabled={save.isPending}
                className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Test
              </button>
              <button
                onClick={runGenerate}
                disabled={generate.isPending}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Regenerate
              </button>
              <button
                onClick={() => setQuestionsEditable((v) => !v)}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  questionsEditable ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {questionsEditable ? "Done Editing" : "Edit Questions"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {test.questions.map((q, i) => (
              <QuestionCard
                key={i}
                question={q}
                index={i}
                editable={questionsEditable}
                onEdit={() => openEditQuestion(i)}
                onDelete={() => deleteQuestion(i)}
              />
            ))}
          </div>

          {questionsEditable && (
            <button
              onClick={openAddQuestion}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </button>
          )}
        </div>
      )}

      <QuestionEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleQuestionSave}
        initial={editingIndex !== null ? test?.questions[editingIndex] ?? null : null}
      />
    </div>
  );
}
