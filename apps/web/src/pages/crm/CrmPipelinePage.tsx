import type { StudentDto, StudentStage } from "@crm/shared-types";
import { Phone } from "lucide-react";
import { useState } from "react";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { useStudents, useUpdateStudentStage } from "../../hooks/use-students";

interface StageColumn {
  key: StudentStage;
  label: string;
}

const COLUMNS: StageColumn[] = [
  { key: "lead", label: "Leads" },
  { key: "trial", label: "Trials" },
  { key: "contract", label: "Contracts" },
  { key: "paid", label: "Payments" },
  { key: "refusal", label: "Refusals" },
];

// What each stage's card offers next — kept as simple, explicit per-stage
// buttons rather than generic "advance/revert" logic, per the "keep it
// simple" brief. "Back to Lead" resets a student for re-engagement; refusal
// is otherwise terminal (no forward move out of it besides that reset).
function nextStageActions(stage: string): { label: string; stage: StudentStage }[] {
  const actions: { label: string; stage: StudentStage }[] = [];
  if (stage === "lead") actions.push({ label: "Move to Trial", stage: "trial" });
  if (stage === "trial") actions.push({ label: "Move to Contract", stage: "contract" });
  if (stage === "contract") actions.push({ label: "Mark as Paid", stage: "paid" });
  if (stage !== "refusal") actions.push({ label: "Mark as Refusal", stage: "refusal" });
  if (stage !== "lead") actions.push({ label: "Back to Lead", stage: "lead" });
  return actions;
}

function StudentCard({ student, onClick }: { student: StudentDto; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary/40"
    >
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{student.name}</p>
      {student.phone && (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Phone className="h-3 w-3" />
          {student.phone}
        </p>
      )}
    </button>
  );
}

function StudentStageModal({ student, onClose }: { student: StudentDto | null; onClose: () => void }) {
  const updateStage = useUpdateStudentStage();
  const { showToast } = useToast();

  async function move(stage: StudentStage) {
    if (!student) return;
    try {
      await updateStage.mutateAsync({ id: student.id, stage });
      showToast(`${student.name} moved to ${stage}.`);
      onClose();
    } catch {
      showToast("Failed to update stage.", "error");
    }
  }

  return (
    <Modal open={Boolean(student)} onClose={onClose} title={student?.name ?? ""} widthClassName="max-w-sm">
      {student && (
        <div className="space-y-4">
          <div className="space-y-1 text-sm">
            <p className="text-slate-600 dark:text-slate-300">Phone: {student.phone ?? "-"}</p>
            <p className="text-slate-600 dark:text-slate-300">Email: {student.email ?? "-"}</p>
            <p className="capitalize text-slate-600 dark:text-slate-300">Current stage: {student.stage}</p>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            {nextStageActions(student.stage).map((action) => (
              <button
                key={action.stage}
                onClick={() => move(action.stage)}
                disabled={updateStage.isPending}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function CrmPipelinePage() {
  const { data: students, isLoading } = useStudents();
  const [selected, setSelected] = useState<StudentDto | null>(null);

  const byStage = new Map<string, StudentDto[]>();
  for (const student of students ?? []) {
    const list = byStage.get(student.stage) ?? [];
    list.push(student);
    byStage.set(student.stage, list);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">CRM Pipeline</h1>

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>}

      {!isLoading && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((column) => {
            const columnStudents = byStage.get(column.key) ?? [];
            return (
              <div key={column.key} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between rounded-t-lg border border-b-0 border-slate-200 bg-slate-100 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{column.label}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {columnStudents.length}
                  </span>
                </div>
                <div className="flex min-h-[120px] flex-col gap-2 rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/40">
                  {columnStudents.length === 0 && (
                    <p className="px-1 py-2 text-center text-xs text-slate-400 dark:text-slate-500">No students</p>
                  )}
                  {columnStudents.map((student) => (
                    <StudentCard key={student.id} student={student} onClick={() => setSelected(student)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StudentStageModal student={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
