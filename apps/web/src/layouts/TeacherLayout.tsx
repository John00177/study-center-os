import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Calendar, CalendarDays, LayoutDashboard, Lock, LogOut, Sparkles, UsersRound, Wallet } from "lucide-react";
import type { PlanModule } from "@crm/shared-types";
import { useAuthStore } from "../stores/auth.store";
import { api } from "../lib/api";
import { OfflineBanner } from "../components/OfflineBanner";
import { OrgLogo } from "../components/branding/OrgLogo";
import { DailyBriefing } from "../components/DailyBriefing";
import { FeedbackWidget } from "../components/feedback/FeedbackWidget";
import { useSyncOfflineQueue } from "../hooks/use-offline-sync";
import { useCurrentSubscription } from "../hooks/use-subscription";
import { useTheme } from "../contexts/ThemeContext";

const NAV_ITEMS = [
  { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/teacher/groups", label: "My Groups", icon: UsersRound },
  { to: "/teacher/calendar", label: "Calendar", icon: Calendar },
  {
    to: "/teacher/ai-tests/generate",
    label: "AI Test Generator",
    icon: Sparkles,
    requiredModule: "ai_tests" as PlanModule,
  },
  { to: "/teacher/schedule", label: "My Schedule", icon: CalendarDays },
  { to: "/teacher/salary", label: "My Salary", icon: Wallet },
];

export function TeacherLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { branding } = useTheme();
  const { data: subscription } = useCurrentSubscription();
  useSyncOfflineQueue();

  async function handleLogout() {
    await api.post("/auth/logout");
    logout();
    navigate("/teacher/login");
  }

  const orgName = branding?.name ?? "Study Center OS";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white sm:block">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
          <OrgLogo logoUrl={branding?.logoUrl} name={orgName} className="h-8 w-8" />
          <span className="truncate text-lg font-semibold tracking-tight text-slate-900">{orgName}</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, requiredModule }) => {
            const locked = requiredModule && subscription && !subscription.allowedModules.includes(requiredModule);
            if (locked) {
              return (
                <button
                  key={to}
                  onClick={() => navigate("/settings/plan")}
                  title="Upgrade to unlock"
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-100"
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} />
                    {label}
                  </span>
                  <Lock size={14} />
                </button>
              );
            }
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <OfflineBanner />
        <header className="flex items-center justify-between border-b border-primary/10 bg-primary/5 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 sm:hidden">
            <OrgLogo logoUrl={branding?.logoUrl} name={orgName} className="h-6 w-6" />
            <span className="truncate text-sm font-semibold text-slate-900">{orgName}</span>
          </div>
          <span className="hidden text-sm text-slate-500 sm:inline">{orgName}</span>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-20 sm:px-6 sm:pb-6">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white sm:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                isActive ? "text-primary" : "text-slate-500"
              }`
            }
          >
            <Icon size={22} className="min-h-[24px] min-w-[24px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <DailyBriefing role="teacher" dashboardHref="/teacher" />
      {user && <FeedbackWidget basePath="support-tickets" profile={{ name: user.name, email: user.email }} />}
    </div>
  );
}
