import type { AttendanceStatus } from "@crm/shared-types";
import { CheckCheck, Loader2, Plus } from "lucide-react";
import { isAxiosError } from "axios";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DataTable } from "../../components/DataTable";
import { Fab } from "../../components/Fab";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { TextField } from "../../components/form/Field";
import { AssignHomeworkModal } from "../../components/homework/AssignHomeworkModal";
import { HomeworkDetailModal } from "../../components/homework/HomeworkDetailModal";
import { StudentHomeworkListModal } from "../../components/homework/StudentHomeworkListModal";
import { StudentHomeworkPendingBadge } from "../../components/homework/StudentHomeworkPendingBadge";
import { enqueueAttendanceAction } from "../../lib/offline-queue";
import { useGroupHomework } from "../../hooks/use-homework";
import { useTranslation } from "../../hooks/use-translation";
import {
  useCreateLessonNote,
  useGroupAttendance,
  useGroupStudents,
  useLessonNotes,
  useMarkGroupAttendance,
  useMyGroups,
} from "../../hooks/use-teacher-dashboard";

type TabKey = "students" | "attendance" | "lessons" | "homework";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: "present", label: "Present", activeClass: "bg-green-600 text-white border-green-600" },
  { value: "absent", label: "Absent", activeClass: "bg-red-600 text-white border-red-600" },
  { value: "late", label: "Late", activeClass: "bg-yellow-500 text-white border-yellow-500" },
  { value: "excused", label: "Excused", activeClass: "bg-blue-600 text-white border-blue-600" },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const MOBILE_CYCLE: AttendanceStatus[] = ["present", "absent", "late"];
const MOBILE_STATUS_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-green-600 border-green-600 text-white",
  absent: "bg-red-600 border-red-600 text-white",
  late: "bg-yellow-500 border-yellow-500 text-white",
  excused: "bg-blue-600 border-blue-600 text-white",
};
const MOBILE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

function weekPillsAround(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      iso: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      dayNum: date.getDate(),
    };
  });
}

function StudentsTab({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const { data: students, isLoading } = useGroupStudents(groupId);
  const [viewingHomeworkFor, setViewingHomeworkFor] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      <DataTable
        data={students}
        isLoading={isLoading}
        emptyMessage={t("No active students in this group.")}
        getRowKey={(s) => s.id}
        onRowClick={(s) => setViewingHomeworkFor({ id: s.id, name: s.name })}
        columns={[
          { header: t("Name"), render: (s) => <span className="font-medium text-slate-900 dark:text-slate-100">{s.name}</span> },
          { header: t("Phone"), render: (s) => s.phone ?? "-" },
          {
            header: t("Attendance Rate"),
            render: (s) => (s.attendanceRate === null ? "No records yet" : `${s.attendanceRate}%`),
            align: "right",
          },
          { header: t("Homework"), render: (s) => <StudentHomeworkPendingBadge studentId={s.id} /> },
        ]}
      />

      <StudentHomeworkListModal
        open={Boolean(viewingHomeworkFor)}
        onClose={() => setViewingHomeworkFor(null)}
        studentId={viewingHomeworkFor?.id ?? null}
        studentName={viewingHomeworkFor?.name}
      />
    </>
  );
}

function AttendanceTab({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayIsoDate());
  const { showToast } = useToast();
  const { data: students, isLoading: studentsLoading } = useGroupStudents(groupId);
  const { data: existing, isLoading: attendanceLoading } = useGroupAttendance(groupId, date);
  const markAttendance = useMarkGroupAttendance(groupId);

  const [entries, setEntries] = useState<Record<string, { status: AttendanceStatus | null; notes: string }>>({});

  useEffect(() => {
    const next: Record<string, { status: AttendanceStatus | null; notes: string }> = {};
    for (const student of students ?? []) {
      const record = existing?.find((a) => a.studentId === student.id);
      next[student.id] = { status: record?.status ?? null, notes: record?.notes ?? "" };
    }
    setEntries(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, date, students, existing]);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setEntries((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  }

  function markAllPresent() {
    setEntries((prev) => {
      const next = { ...prev };
      for (const student of students ?? []) {
        next[student.id] = { ...next[student.id], status: "present" };
      }
      return next;
    });
  }

  async function saveRecords(records: { studentId: string; status: AttendanceStatus; notes?: string }[]) {
    try {
      await markAttendance.mutateAsync({ date, records });
      showToast(t("Attendance saved."));
    } catch (err) {
      // Offline (or otherwise unreachable API): queue it locally and sync on reconnect.
      if (!navigator.onLine || (isAxiosError(err) && !err.response)) {
        enqueueAttendanceAction({ groupId, date, records });
        showToast(t("Saved offline — will sync when you're back online."));
      } else {
        showToast(t("Failed to save attendance."), "error");
      }
    }
  }

  async function handleSave() {
    const roster = students ?? [];
    const unset = roster.filter((s) => !entries[s.id]?.status);
    if (unset.length > 0) {
      showToast(t("Mark a status for every student before saving."), "error");
      return;
    }

    const records = roster.map((s) => ({
      studentId: s.id,
      status: entries[s.id].status as AttendanceStatus,
      notes: entries[s.id].notes.trim() || undefined,
    }));
    await saveRecords(records);
  }

  // Mobile auto-save: cycle the tapped student's status, then persist
  // whatever the roster's current state is — no explicit submit needed.
  // (Side effects live outside the setEntries updater deliberately: updater
  // functions can run twice under StrictMode, which would double-fire saves.)
  function cycleStatusMobile(studentId: string) {
    const current = entries[studentId]?.status;
    const idx = current ? MOBILE_CYCLE.indexOf(current) : -1;
    const nextStatus = MOBILE_CYCLE[(idx + 1) % MOBILE_CYCLE.length];
    const next = { ...entries, [studentId]: { ...entries[studentId], status: nextStatus } };
    setEntries(next);
    void autoSave(next);
  }

  function setExcusedMobile(studentId: string) {
    const next = { ...entries, [studentId]: { ...entries[studentId], status: "excused" as AttendanceStatus } };
    setEntries(next);
    void autoSave(next);
    setNoteFor(studentId);
  }

  async function autoSave(snapshot: Record<string, { status: AttendanceStatus | null; notes: string }>) {
    const roster = students ?? [];
    const records = roster
      .filter((s) => snapshot[s.id]?.status)
      .map((s) => ({
        studentId: s.id,
        status: snapshot[s.id].status as AttendanceStatus,
        notes: snapshot[s.id].notes.trim() || undefined,
      }));
    if (records.length === 0) return;
    await saveRecords(records);
  }

  function handleTouchStart(studentId: string) {
    longPressTimer.current = setTimeout(() => setExcusedMobile(studentId), 550);
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  const isReady = !studentsLoading && !attendanceLoading;
  const roster = students ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="hidden sm:block">
          <TextField label={t("Date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex w-full gap-1.5 overflow-x-auto pb-1 sm:hidden">
          {weekPillsAround(date).map((pill) => (
            <button
              key={pill.iso}
              type="button"
              onClick={() => setDate(pill.iso)}
              className={`flex shrink-0 flex-col items-center rounded-full px-3 py-1.5 text-xs font-medium ${
                pill.iso === date ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              <span>{t(pill.label)}</span>
              <span className="text-sm">{pill.dayNum}</span>
            </button>
          ))}
        </div>
        <button
          onClick={markAllPresent}
          className="hidden items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex"
        >
          <CheckCheck className="h-4 w-4" />
          {t("Mark All Present")}
        </button>
      </div>

      {!isReady && <p className="text-sm text-slate-500">{t("Loading...")}</p>}
      {isReady && roster.length === 0 && <p className="text-sm text-slate-500">{t("No active students in this group.")}</p>}

      {isReady && roster.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {roster.map((student) => {
                const entry = entries[student.id] ?? { status: null, notes: "" };
                return (
                  <div key={student.id} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-slate-900 dark:text-slate-100 sm:w-40 sm:shrink-0">{student.name}</p>

                      {/* Desktop: explicit status buttons */}
                      <div className="hidden flex-wrap gap-2 sm:flex">
                        {STATUS_OPTIONS.map((opt) => {
                          const isActive = entry.status === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setStatus(student.id, opt.value)}
                              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                                isActive ? opt.activeClass : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {t(opt.label)}
                            </button>
                          );
                        })}
                      </div>

                      {/* Mobile: tap to cycle present/absent/late, long-press for excused + note */}
                      <button
                        type="button"
                        onClick={() => cycleStatusMobile(student.id)}
                        onTouchStart={() => handleTouchStart(student.id)}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                        className={`flex min-h-[48px] w-full items-center justify-center rounded-lg border text-sm font-semibold transition sm:hidden ${
                          entry.status ? MOBILE_STATUS_STYLE[entry.status] : "border-slate-300 bg-white text-slate-500"
                        }`}
                      >
                        {entry.status ? MOBILE_STATUS_LABEL[entry.status] : "Tap to mark"}
                      </button>
                    </div>

                    {noteFor === student.id && (
                      <div className="mt-3 sm:hidden">
                        <TextField
                          label={t("Excuse note")}
                          value={entry.notes}
                          onChange={(e) =>
                            setEntries((prev) => ({
                              ...prev,
                              [student.id]: { ...prev[student.id], notes: e.target.value },
                            }))
                          }
                          onBlur={() => void autoSave(entries)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Fab icon={<CheckCheck className="h-6 w-6" />} label={t("Mark all present")} onClick={markAllPresent} />

          <div className="mt-4 hidden justify-end sm:flex">
            <button
              onClick={handleSave}
              disabled={markAttendance.isPending}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {markAttendance.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Save attendance")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AddLessonNoteModal({ open, onClose, groupId }: { open: boolean; onClose: () => void; groupId: string }) {
  const { t } = useTranslation();
  const createLessonNote = useCreateLessonNote(groupId);
  const { showToast } = useToast();
  const [form, setForm] = useState({ title: "", description: "", date: todayIsoDate() });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ title: "", description: "", date: todayIsoDate() });
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    try {
      await createLessonNote.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        date: form.date,
      });
      showToast(t("Lesson note added."));
      onClose();
    } catch {
      showToast(t("Failed to add lesson note."), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Add Lesson Note")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t("Title")}
          required
          value={form.title}
          error={error ?? undefined}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <TextField
          label={t("Description")}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <TextField
          label={t("Date")}
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createLessonNote.isPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={createLessonNote.isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {createLessonNote.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Save note")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LessonsTab({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const { data: lessons, isLoading } = useLessonNotes(groupId);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {t("Add Note")}
        </button>
      </div>

      <DataTable
        data={lessons}
        isLoading={isLoading}
        emptyMessage='No lesson notes yet. Click "Add Note" to add one.'
        getRowKey={(l) => l.id}
        columns={[
          { header: t("Date"), render: (l) => new Date(l.date).toLocaleDateString() },
          { header: t("Title"), render: (l) => <span className="font-medium text-slate-900 dark:text-slate-100">{l.title}</span> },
          { header: t("Description"), render: (l) => l.description ?? "-" },
        ]}
      />

      <AddLessonNoteModal open={addOpen} onClose={() => setAddOpen(false)} groupId={groupId} />
    </div>
  );
}

function HomeworkTab({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const { data: homework, isLoading } = useGroupHomework(groupId);
  const { data: lessons } = useLessonNotes(groupId);
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setAssignOpen(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {t("Assign Homework")}
        </button>
      </div>

      <DataTable
        data={homework}
        isLoading={isLoading}
        emptyMessage='No homework assigned yet. Click "Assign Homework" to add one.'
        getRowKey={(h) => h.id}
        onRowClick={(h) => setViewingId(h.id)}
        columns={[
          { header: t("Title"), render: (h) => <span className="font-medium text-slate-900 dark:text-slate-100">{h.title}</span> },
          { header: t("Due Date"), render: (h) => new Date(h.dueDate).toLocaleDateString() },
          { header: t("Status"), render: (h) => <span className="capitalize">{h.status}</span> },
          {
            header: t("Submissions"),
            render: (h) => `${h.submissionCounts?.submitted ?? 0}/${h.submissionCounts?.total ?? 0} submitted`,
          },
        ]}
      />

      <AssignHomeworkModal open={assignOpen} onClose={() => setAssignOpen(false)} groupId={groupId} lessons={lessons} />
      <HomeworkDetailModal open={Boolean(viewingId)} onClose={() => setViewingId(null)} homeworkId={viewingId} />
    </div>
  );
}

export function GroupDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: groups } = useMyGroups();
  const group = groups?.find((g) => g.id === id);

  const tabParam = searchParams.get("tab");
  const initialTab: TabKey =
    tabParam === "attendance" || tabParam === "lessons" || tabParam === "homework" ? tabParam : "students";
  const [tab, setTab] = useState<TabKey>(initialTab);

  if (!id) return null;

  function selectTab(next: TabKey) {
    setTab(next);
    setSearchParams(next === "students" ? {} : { tab: next });
  }

  return (
    <div>
      <Link to="/teacher/groups" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        {t("Back to my groups")}
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{group?.name ?? "Group"}</h1>
      <p className="mb-6 text-sm text-slate-500">{group?.course?.name}</p>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {(["students", "attendance", "lessons", "homework"] as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => selectTab(key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize ${
              tab === key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {key === "lessons" ? "Lesson Notes" : key}
          </button>
        ))}
      </div>

      {tab === "students" && <StudentsTab groupId={id} />}
      {tab === "attendance" && <AttendanceTab groupId={id} />}
      {tab === "lessons" && <LessonsTab groupId={id} />}
      {tab === "homework" && <HomeworkTab groupId={id} />}
    </div>
  );
}
