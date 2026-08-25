import type { TeacherDto } from "@crm/shared-types";
import { useMemo, useState } from "react";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { TextField } from "../components/form/Field";
import { useTeacher, useTeachers } from "../hooks/use-teachers";
import { useTranslation } from "../hooks/use-translation";

function DashboardStatusBadge({ status }: { status: TeacherDto["dashboardStatus"] }) {
  const styles: Record<TeacherDto["dashboardStatus"], string> = {
    not_activated: "bg-slate-100 text-slate-600",
    active: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function TeacherDetailModal({ teacherId, onClose }: { teacherId: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: teacher, isLoading } = useTeacher(teacherId);

  return (
    <Modal open={Boolean(teacherId)} onClose={onClose} title={teacher?.name ?? "Teacher"}>
      {isLoading || !teacher ? (
        <p className="text-sm text-slate-500">{t("Loading...")}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <DashboardStatusBadge status={teacher.dashboardStatus} />
            {teacher.specialization && <span className="text-sm text-slate-500">{teacher.specialization}</span>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("Email")}</p>
              <p className="text-sm text-slate-900 dark:text-slate-100">{teacher.email ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("Phone")}</p>
              <p className="text-sm text-slate-900 dark:text-slate-100">{teacher.phone ?? "-"}</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Assigned groups ({teacher.groups?.length ?? 0})
            </h3>
            {teacher.groups && teacher.groups.length > 0 ? (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {teacher.groups.map((g) => (
                  <li key={g.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{g.name}</span>
                    <span className="text-slate-500">
                      {g.courseName ?? "-"} · {g.branchName ?? "-"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{t("No groups assigned yet.")}</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ReceptionTeachersPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useTeachers();
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data?.filter((t) => t.name.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("Teachers")}</h1>
      </div>

      <div className="mb-4 w-64">
        <TextField label={t("Search")} placeholder={t("Teacher name...")} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage={t("No teachers yet.")}
        getRowKey={(t) => t.id}
        onRowClick={(t) => setDetailId(t.id)}
        columns={[
          { header: t("Name"), render: (t) => <span className="font-medium text-slate-900 dark:text-slate-100">{t.name}</span> },
          { header: t("Specialization"), render: (t) => t.specialization ?? "-" },
          { header: t("Email"), render: (t) => t.email ?? "-" },
          { header: t("Phone"), render: (t) => t.phone ?? "-" },
          { header: t("Groups"), render: (t) => t.activeGroupCount, align: "right" },
          { header: t("Students"), render: (t) => t.activeStudentCount, align: "right" },
        ]}
      />

      <TeacherDetailModal teacherId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
