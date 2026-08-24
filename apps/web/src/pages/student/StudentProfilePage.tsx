import { useStudentDashboard } from "../../hooks/use-student-portal";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-3">
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900">{value}</p>
    </div>
  );
}

export function StudentProfilePage() {
  const { data, isLoading } = useStudentDashboard();

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">My Profile</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Field label="Name" value={data?.student.name ?? "-"} />
        <Field label="Phone" value={data?.student.phone ?? "-"} />
        <Field label="Email" value={data?.student.email ?? "-"} />
        <Field label="Emergency Contact" value={data?.student.emergencyContact ?? "-"} />
        <Field label="Groups" value={(data?.groups ?? []).map((g) => g.name).join(", ") || "-"} />
      </div>
    </div>
  );
}
