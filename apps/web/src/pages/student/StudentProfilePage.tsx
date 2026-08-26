import { useStudentDashboard } from "../../hooks/use-student-portal";
import { useTranslation } from "../../hooks/use-translation";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-3">
      <p className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

export function StudentProfilePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useStudentDashboard();

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("Loading...")}</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">{t("My Profile")}</h1>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <Field label={t("Name")} value={data?.student.name ?? "-"} />
        <Field label={t("Phone")} value={data?.student.phone ?? "-"} />
        <Field label={t("Email")} value={data?.student.email ?? "-"} />
        <Field label={t("Emergency Contact")} value={data?.student.emergencyContact ?? "-"} />
        <Field label={t("Groups")} value={(data?.groups ?? []).map((g) => g.name).join(", ") || "-"} />
      </div>
    </div>
  );
}
