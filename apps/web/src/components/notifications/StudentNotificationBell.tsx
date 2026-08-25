import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationListDto, UnreadCountDto } from "@crm/shared-types";
import { api } from "../../lib/api";

/**
 * The student portal's bell. Kept separate from NotificationBell rather than
 * parameterized by basePath because the student portal has no org/tenancy
 * headers and no send capability — it is read + mark-read only.
 */
const BASE = "/student/notifications";

function relativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

export function StudentNotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["student-notifications", "unread-count"],
    queryFn: async () => (await api.get<UnreadCountDto>(`${BASE}/unread-count`)).data,
    refetchInterval: 30_000,
  });
  const { data: list } = useQuery({
    queryKey: ["student-notifications", "list"],
    queryFn: async () => (await api.get<NotificationListDto>(BASE, { params: { page: 1, limit: 20 } })).data,
    enabled: open,
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => (await api.patch(`${BASE}/${id}/read`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-notifications"] }),
  });
  const markAllRead = useMutation({
    mutationFn: async () => (await api.patch(`${BASE}/read-all`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const unreadCount = countData?.count ?? 0;
  const items = list?.items ?? [];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-medium leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {items.some((n) => !n.read) && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-500">No notifications</p>}

          <div className="divide-y divide-gray-100">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markRead.mutate(n.id)}
                className={`flex w-full flex-col items-start border-l-4 px-3 py-2.5 text-left transition ${
                  n.read ? "border-transparent hover:bg-slate-50" : "border-blue-500 bg-blue-50 hover:bg-blue-100"
                }`}
              >
                <span className="text-sm font-semibold text-slate-900">{n.title}</span>
                <span className="text-xs text-slate-500">{n.message}</span>
                <span className="mt-0.5 text-xs text-gray-400">
                  {n.senderName ? `From: ${n.senderName} · ` : ""}
                  {relativeTime(n.createdAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
