import { Mail, MessageCircle, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { useParentTeachers } from "../../hooks/use-parent-portal";
import { TextField } from "../../components/form/Field";
import { useTranslation } from "../../hooks/use-translation";

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-pink-100 text-pink-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-purple-100 text-purple-700",
];

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function avatarColorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function toWhatsAppLink(phone: string) {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;
}

export function ParentTeachersPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useParentTeachers();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data?.filter((teacher) => teacher.name.toLowerCase().includes(q));
  }, [data, search]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">{t("Loading...")}</p>;
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">{t("My Child's Teachers")}</h1>
      <p className="mb-4 text-sm text-slate-500">{t("Reach out directly with any questions.")}</p>

      <div className="mb-4">
        <TextField label={t("Search")} placeholder={t("Teacher name...")} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {(!filtered || filtered.length === 0) && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">{t("No teachers assigned yet.")}</p>
      )}

      <div className="space-y-3">
        {filtered?.map((teacher, i) => (
          <div key={`${teacher.id}-${i}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold ${avatarColorFor(teacher.name)}`}
              >
                {initialsFor(teacher.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-slate-900">{teacher.name}</p>
                {teacher.specialization && <p className="truncate text-sm text-slate-500">{teacher.specialization}</p>}
                <p className="truncate text-xs text-slate-400">
                  {teacher.groupName} · {teacher.courseName}
                </p>
              </div>
            </div>

            {(teacher.phone || teacher.email) ? (
              <div className="mt-3 flex gap-2">
                {teacher.phone && (
                  <a
                    href={`tel:${teacher.phone}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-green-50 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100"
                  >
                    <Phone className="h-4 w-4" />
                    {t("Call")}
                  </a>
                )}
                {teacher.email && (
                  <a
                    href={`mailto:${teacher.email}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-indigo-50 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    <Mail className="h-4 w-4" />
                    {t("Email")}
                  </a>
                )}
                {teacher.phone && (
                  <a
                    href={toWhatsAppLink(teacher.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t("WhatsApp")}
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-md bg-slate-50 p-2.5 text-center text-sm text-slate-500">
                Contact via reception{teacher.branchPhone ? ` at ${teacher.branchPhone}` : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
