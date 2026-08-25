import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUnreadNotificationCount } from "../../hooks/use-notifications";
import { NotificationPanel } from "./NotificationPanel";

// "light" adapts to the app's light/dark toggle via dark: classes (used in
// DashboardLayout). "dark" is a fixed dark palette for surfaces that never
// participate in that toggle — the platform admin shell is always dark
// (bg-slate-950 etc, no `dark` class on <html>), so dark: variants there
// would never activate and the button would render with light-mode colors
// on a dark background.
export function NotificationBell({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data } = useUnreadNotificationCount();
  const unreadCount = data?.count ?? 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className={
          variant === "dark"
            ? "relative rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            : "relative rounded-md p-1.5 text-gray-500 hover:text-gray-700 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200"
        }
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-medium leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} forceDark={variant === "dark"} />}
    </div>
  );
}
