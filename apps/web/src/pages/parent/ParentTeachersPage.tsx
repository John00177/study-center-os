import { Mail, MessageCircle, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { useParentTeachers } from "../../hooks/use-parent-portal";
import { TextField } from "../../components/form/Field";

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
  const { data, isLoading } = useParentTeachers();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data?.filter((t) => t.name.toLowerCase().includes(q));
  }, [data, search]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">My Child's Teachers</h1>
      <p className="mb-4 text-sm text-slate-500">Reach out directly with any questions.</p>

      <div className="mb-4">
        <TextField label="Search" placeholder="Teacher name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {(!filtered || filtered.length === 0) && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No teachers assigned yet.</p>
      )}

      <div className="space-y-3">
        {filtered?.map((t, i) => (
          <div key={`${t.id}-${i}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold ${avatarColorFor(t.name)}`}
              >
                {initialsFor(t.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-slate-900">{t.name}</p>
                {t.specialization && <p className="truncate text-sm text-slate-500">{t.specialization}</p>}
                <p className="truncate text-xs text-slate-400">
                  {t.groupName} · {t.courseName}
                </p>
              </div>
            </div>

            {(t.phone || t.email) ? (
              <div className="mt-3 flex gap-2">
                {t.phone && (
                  <a
                    href={`tel:${t.phone}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-green-50 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}
                {t.email && (
                  <a
                    href={`mailto:${t.email}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-indigo-50 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                )}
                {t.phone && (
                  <a
                    href={toWhatsAppLink(t.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-md bg-slate-50 p-2.5 text-center text-sm text-slate-500">
                Contact via reception{t.branchPhone ? ` at ${t.branchPhone}` : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
