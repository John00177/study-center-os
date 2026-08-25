import type { StudentDetailDto, StudentDto } from "@crm/shared-types";
import { ArrowLeft, Eye, Lightbulb, Pencil, Plus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { AttendanceStatusBadge } from "../../components/attendance/AttendanceStatusBadge";
import { PaymentMethodBadge } from "../../components/finance/PaymentMethodBadge";
import { SelectField } from "../../components/form/Field";
import { useToast } from "../../components/Toast";
import { useStudentAttendanceHistory } from "../../hooks/use-attendance";
import { useCharges, usePayments } from "../../hooks/use-finance";
import { useStudentDetail, useUpdateStudent } from "../../hooks/use-students";
import { formatCurrency } from "../../lib/format";
import { StudentForm } from "../StudentsPage";
import { PaymentForm } from "../FinancePage";

const TABS = ["Profile", "Payments", "Schedule", "Attendance", "Grades", "Notes", "History"] as const;
type Tab = (typeof TABS)[number];

const STAGE_BADGE_CLASSES: Record<string, string> = {
  lead: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  trial: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  contract: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  refusal: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  newcomer: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  active: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  dropped: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  archived: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

function ageFromBirthDate(dateOfBirth?: string | null): string {
  if (!dateOfBirth) return "-";
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return String(age);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      {/* div, not p — value can hold block content (lists, badges), which p can't legally contain */}
      <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value ?? "-"}</div>
    </div>
  );
}

// Converts the detail payload (which omits activeGroupCount/enrollmentStatus
// — see StudentDetailDto in shared-types) into a full StudentDto so the
// existing StudentForm/StudentAttendanceHistoryModal-style components can be
// reused without changing their prop types.
function toStudentDto(detail: StudentDetailDto): StudentDto {
  return {
    ...detail,
    activeGroupCount: detail.groups.length,
    enrollmentStatus: detail.groups.length > 0 ? "enrolled" : "not_enrolled",
  };
}

function ProfileTab({ detail }: { detail: StudentDetailDto }) {
  return (
    <Card>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Full Name" value={detail.name} />
        <Field label="Phone" value={detail.phone} />
        <Field label="Parent Phone" value={detail.parentPhone} />
        <Field label="Gender" value={detail.gender ? <span className="capitalize">{detail.gender}</span> : null} />
        <Field
          label="Birth Date"
          value={detail.dateOfBirth ? `${new Date(detail.dateOfBirth).toLocaleDateString()} (age ${ageFromBirthDate(detail.dateOfBirth)})` : null}
        />
        <Field label="Social Account" value={detail.socialAccount} />
        <Field
          label="Medical Card"
          value={
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                detail.medicalCard
                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {detail.medicalCard ? "Yes" : "No"}
            </span>
          }
        />
        <Field
          label="Status"
          value={
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[detail.status]}`}>
              {detail.status}
            </span>
          }
        />
        <Field label="Enrollment Date" value={new Date(detail.registeredAt).toLocaleDateString()} />
        <div className="sm:col-span-2">
          <Field
            label="Assigned Groups"
            value={
              detail.groups.length === 0 ? (
                "Not assigned to any group"
              ) : (
                <ul className="mt-1 space-y-1">
                  {detail.groups.map((g) => (
                    <li key={g.id}>
                      {g.name}
                      {g.course ? ` — ${g.course.name}` : ""}
                      {g.scheduleDays.length > 0 ? ` (${g.scheduleDays.join(", ")}${g.startTime ? ` | ${g.startTime}-${g.endTime}` : ""})` : ""}
                    </li>
                  ))}
                </ul>
              )
            }
          />
        </div>
        {detail.notes && (
          <div className="sm:col-span-2">
            <Field label="Note" value={<span className="whitespace-pre-wrap">{detail.notes}</span>} />
          </div>
        )}
      </div>
    </Card>
  );
}

interface LedgerRow {
  id: string;
  date: string;
  amount: number;
  currency: string;
  method: string | null;
  period: string | null;
  type: "payment" | "charge";
  note: string | null;
}

function formatPeriod(startIso?: string | null, endIso?: string | null): string | null {
  if (!startIso || !endIso) return null;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(startIso)} - ${fmt(endIso)}`;
}

function PaymentsTab({ studentId }: { studentId: string }) {
  const { data: payments, isLoading: paymentsLoading } = usePayments({ studentId });
  const { data: charges, isLoading: chargesLoading } = useCharges({ studentId });
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);

  const rows: LedgerRow[] = useMemo(() => {
    const paymentRows: LedgerRow[] = (payments ?? []).map((p) => ({
      id: `payment-${p.id}`,
      date: p.createdAt,
      amount: p.amount,
      currency: p.currency,
      method: p.paymentMethod,
      period: formatPeriod(p.periodStartDate, p.periodEndDate),
      type: "payment",
      note: p.reference ?? null,
    }));
    const chargeRows: LedgerRow[] = (charges ?? []).map((c) => ({
      id: `charge-${c.id}`,
      date: c.createdAt,
      amount: c.amount,
      currency: c.currency,
      method: null,
      period: null,
      type: "charge",
      note: c.description ?? null,
    }));
    return [...paymentRows, ...chargeRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, charges]);

  const totalPaid = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const totalCharges = (charges ?? []).reduce((sum, c) => sum + c.amount, 0);
  const balance = totalCharges - totalPaid;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Total Paid</p>
          <p className="mt-1 text-xl font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalPaid, "UZS")}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Total Charges</p>
          <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">{formatCurrency(totalCharges, "UZS")}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Balance</p>
          <p className={`mt-1 text-xl font-semibold ${balance > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>
            {formatCurrency(balance, "UZS")}
          </p>
        </Card>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setPaymentFormOpen(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Payment
        </button>
      </div>

      <DataTable
        data={rows}
        isLoading={paymentsLoading || chargesLoading}
        emptyMessage="No payments or charges yet."
        getRowKey={(r) => r.id}
        columns={[
          { header: "Date", render: (r) => new Date(r.date).toLocaleDateString() },
          {
            header: "Amount",
            render: (r) => (
              <span className={r.type === "payment" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {r.type === "payment" ? "+" : "-"}
                {formatCurrency(r.amount, r.currency)}
              </span>
            ),
          },
          { header: "Method", render: (r) => (r.method ? <PaymentMethodBadge method={r.method} /> : "-") },
          { header: "Period", render: (r) => r.period ?? "-" },
          { header: "Type", render: (r) => <span className="capitalize">{r.type}</span> },
          { header: "Note", render: (r) => r.note ?? "-" },
        ]}
      />

      <PaymentForm open={paymentFormOpen} onClose={() => setPaymentFormOpen(false)} presetStudentId={studentId} />
    </div>
  );
}

function ScheduleTab({ detail }: { detail: StudentDetailDto }) {
  if (detail.groups.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400">Not assigned to any group yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {detail.groups.map((group) => (
        <Card key={group.id}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{group.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{group.course?.name ?? "No course"}</p>
            </div>
            <Link to="/groups" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              View Group
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Days" value={group.scheduleDays.length > 0 ? group.scheduleDays.join(", ") : null} />
            <Field label="Time" value={group.startTime ? `${group.startTime} - ${group.endTime}` : null} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function AttendanceTab({ studentId }: { studentId: string }) {
  const { data, isLoading } = useStudentAttendanceHistory(studentId);
  const [groupFilter, setGroupFilter] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of data ?? []) {
      if (record.group) map.set(record.group.id, record.group.name);
    }
    return [...map.entries()];
  }, [data]);

  const filtered = groupFilter ? (data ?? []).filter((r) => r.group?.id === groupFilter) : data;

  const now = new Date();
  const thisMonth = (data ?? []).filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const presentRate = thisMonth.length > 0 ? Math.round((thisMonth.filter((r) => r.status === "present").length / thisMonth.length) * 100) : null;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">This Month</p>
        <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
          {presentRate === null ? "No records this month" : `${presentRate}% present`}
        </p>
      </Card>

      {groups.length > 0 && (
        <div className="w-48">
          <SelectField label="Filter by group" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="">All groups</option>
            {groups.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </SelectField>
        </div>
      )}

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No attendance records yet."
        getRowKey={(a) => a.id}
        columns={[
          { header: "Date", render: (a) => new Date(a.date).toLocaleDateString() },
          { header: "Group", render: (a) => a.group?.name ?? "-" },
          { header: "Status", render: (a) => <AttendanceStatusBadge status={a.status} /> },
          { header: "Note", render: (a) => a.notes ?? "-" },
        ]}
      />
    </div>
  );
}

function GradesTab() {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Lightbulb className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Grades module coming soon.</p>
      </div>
    </Card>
  );
}

function NotesTab({ detail }: { detail: StudentDetailDto }) {
  const [text, setText] = useState(detail.notes ?? "");
  const updateStudent = useUpdateStudent();
  const { showToast } = useToast();

  async function save() {
    try {
      await updateStudent.mutateAsync({ id: detail.id, name: detail.name, notes: text });
      showToast("Note saved.");
    } catch {
      showToast("Failed to save note.", "error");
    }
  }

  return (
    <Card>
      <textarea
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="No notes yet."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <div className="mt-4 flex justify-end">
        <button
          onClick={save}
          disabled={updateStudent.isPending}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {updateStudent.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </Card>
  );
}

function HistoryTab({ detail }: { detail: StudentDetailDto }) {
  const [viewing, setViewing] = useState<StudentDetailDto["auditLogs"][number] | null>(null);

  return (
    <div>
      <DataTable
        data={detail.auditLogs}
        isLoading={false}
        emptyMessage="No history recorded yet."
        getRowKey={(a) => a.id}
        onRowClick={(a) => setViewing(a)}
        columns={[
          { header: "Date", render: (a) => new Date(a.createdAt).toLocaleString() },
          { header: "Action", render: (a) => <span className="font-mono text-xs">{a.action}</span> },
          { header: "User", render: (a) => a.actorName ?? "Unknown" },
        ]}
        renderActions={(a) => (
          <button
            onClick={() => setViewing(a)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            aria-label="View details"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
      />

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title="History Entry" widthClassName="max-w-2xl">
        {viewing && (
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Before</p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {viewing.beforeValue ? JSON.stringify(viewing.beforeValue, null, 2) : "—"}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">After</p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {viewing.afterValue ? JSON.stringify(viewing.afterValue, null, 2) : "—"}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: detail, isLoading } = useStudentDetail(id);
  const [activeTab, setActiveTab] = useState<Tab>("Profile");
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading || !detail) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>;
  }

  return (
    <div>
      <button
        onClick={() => navigate("/students")}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {initials(detail.name)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{detail.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                <span>{detail.phone ?? "No phone"}</span>
                <span>Parent: {detail.parentPhone ?? "-"}</span>
                <span className="capitalize">{detail.gender ?? "-"}</span>
                <span>Age: {ageFromBirthDate(detail.dateOfBirth)}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STAGE_BADGE_CLASSES[detail.stage] ?? STAGE_BADGE_CLASSES.lead}`}>
                  {detail.stage}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>
      </Card>

      <div className="sticky top-0 z-10 mt-6 overflow-x-auto border-b border-gray-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-w-max gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === "Profile" && <ProfileTab detail={detail} />}
        {activeTab === "Payments" && <PaymentsTab studentId={detail.id} />}
        {activeTab === "Schedule" && <ScheduleTab detail={detail} />}
        {activeTab === "Attendance" && <AttendanceTab studentId={detail.id} />}
        {activeTab === "Grades" && <GradesTab />}
        {activeTab === "Notes" && <NotesTab detail={detail} />}
        {activeTab === "History" && <HistoryTab detail={detail} />}
      </div>

      <StudentForm open={editOpen} onClose={() => setEditOpen(false)} student={toStudentDto(detail)} />
    </div>
  );
}
