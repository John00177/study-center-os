import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, Building, ClipboardList, LayoutDashboard, LogOut, MessageCircle, TrendingUp } from "lucide-react";
import { useAuthStore } from "../stores/auth.store";
import { api } from "../lib/api";
import { usePendingApplications } from "../hooks/use-platform-admin";
import { DailyBriefing } from "../components/DailyBriefing";
import { NotificationBell } from "../components/notifications/NotificationBell";
import { useTranslation } from "../hooks/use-translation";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/study-centers", label: "Study Centers", icon: Building },
  { to: "/admin/applications", label: "Applications", icon: ClipboardList },
  { to: "/admin/revenue", label: "Revenue", icon: TrendingUp },
  { to: "/admin/health", label: "Health", icon: Activity },
  { to: "/admin/support-tickets", label: "Support Tickets", icon: MessageCircle },
];

export function PlatformAdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { data: applications } = usePendingApplications();
  const pendingCount = applications?.length ?? 0;

  async function handleLogout() {
    await api.post("/auth/logout");
    logout();
    navigate("/platform/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-slate-900 sm:block">
        <div className="border-b border-slate-800 px-4 py-4">
          <span className="text-lg font-semibold text-white">{t("Platform Admin")}</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <span className="flex items-center gap-3">
                <Icon size={18} />
                {t(label)}
              </span>
              {to === "/admin/applications" && pendingCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
          <span className="text-sm text-slate-400">{t("Study Center OS — Platform")}</span>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-white">{user?.name}</span>
            <NotificationBell variant="dark" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <LogOut size={16} />
              {t("Logout")}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      <DailyBriefing role="platform_admin" dashboardHref="/admin" />
    </div>
  );
}
