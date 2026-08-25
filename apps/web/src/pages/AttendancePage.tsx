import type { AttendanceStatus } from "@crm/shared-types";
import { CheckCheck, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import { SelectField, TextField } from "../components/form/Field";
import { useAttendanceForGroupDate, useBulkMarkAttendance } from "../hooks/use-attendance";
import { useGroupMemberships, useGroups } from "../hooks/use-groups";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: "present", label: "Present", activeClass: "bg-green-600 text-white border-green-600" },
  { value: "absent", label: "Absent", activeClass: "bg-red-600 text-white border-red-600" },
  { value: "late", label: "Late", activeClass: "bg-yellow-500 text-white border-yellow-500" },
  { value: "excused", label: "Excused", activeClass: "bg-blue-600 text-white border-blue-600" },
];

interface EntryState {
  status: AttendanceStatus | null;
  notes: string;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage() {
  const { data: groups } = useGroups();
  const [searchParams] = useSearchParams();
  const [groupId, setGroupId] = useState(() => searchParams.get("groupId") ?? "");
  const [date, setDate] = useState(() => searchParams.get("date") ?? todayIsoDate());
  const { showToast } = useToast();

  const { data: memberships, isLoading: membershipsLoading } = useGroupMemberships(groupId);
  const { data: existingAttendance, isLoading: attendanceLoading } = useAttendanceForGroupDate(groupId, date);
  const bulkMark = useBulkMarkAttendance();

  const activeMembers = useMemo(
    () => (memberships ?? []).filter((m) => m.status === "active" && m.student),
    [memberships],
  );

  const [entries, setEntries] = useState<Record<string, EntryState>>({});

  useEffect(() => {
    const next: Record<string, EntryState> = {};
    for (const member of activeMembers) {
      const existing = existingAttendance?.find((a) => a.studentId === member.studentId);
      next[member.studentId] = {
        status: existing?.status ?? null,
        notes: existing?.notes ?? "",
      };
    }
    setEntries(next);
    // Re-derive whenever the roster or the loaded attendance for this group+date changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, date, memberships, existingAttendance]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setEntries((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  }

  function setNotes(studentId: string, notes: string) {
    setEntries((prev) => ({ ...prev, [studentId]: { ...prev[studentId], notes } }));
  }

  function markAllPresent() {
    setEntries((prev) => {
      const next = { ...prev };
      for (const member of activeMembers) {
        next[member.studentId] = { ...next[member.studentId], status: "present" };
      }
      return next;
    });
  }

  const hasExistingRecords = (existingAttendance?.length ?? 0) > 0;
  const isReady = Boolean(groupId && date) && !membershipsLoading && !attendanceLoading;

  async function handleSave() {
    const unset = activeMembers.filter((m) => !entries[m.studentId]?.status);
    if (unset.length > 0) {
      showToast("Mark a status for every student before saving.", "error");
      return;
    }

    const records = activeMembers.map((m) => ({
      studentId: m.studentId,
      status: entries[m.studentId].status as AttendanceStatus,
      notes: entries[m.studentId].notes.trim() || undefined,
    }));

    try {
      await bulkMark.mutateAsync({ groupId, date, records });
      showToast("Attendance saved.");
    } catch {
      showToast("Failed to save attendance.", "error");
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Attendance</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-lg">
        <SelectField label="Group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Select group</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {!groupId && <p className="text-sm text-slate-500">Select a group to take attendance.</p>}

      {groupId && !isReady && <p className="text-sm text-slate-500">Loading...</p>}

      {groupId && isReady && activeMembers.length === 0 && (
        <p className="text-sm text-slate-500">This group has no active students enrolled.</p>
      )}

      {groupId && isReady && activeMembers.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {hasExistingRecords ? "Attendance already recorded for this date — editing." : "No attendance recorded yet for this date."}
            </p>
            <button
              onClick={markAllPresent}
              className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Present
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {activeMembers.map((member) => {
                const entry = entries[member.studentId] ?? { status: null, notes: "" };
                return (
                  <div key={member.studentId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-slate-900 dark:text-slate-100 sm:w-40 sm:shrink-0">{member.student?.name}</p>

                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((opt) => {
                        const isActive = entry.status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStatus(member.studentId, opt.value)}
                            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                              isActive
                                ? opt.activeClass
                                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={entry.notes}
                      onChange={(e) => setNotes(member.studentId, e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-48"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={bulkMark.isPending}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {bulkMark.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save attendance
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
