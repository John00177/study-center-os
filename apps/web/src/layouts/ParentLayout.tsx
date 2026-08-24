import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Banknote, CalendarDays, ClipboardList, LayoutDashboard, LogOut, Users } from "lucide-react";
import { useParentAuthStore } from "../stores/parent-auth.store";
import { useParentDashboard, useParentLogout } from "../hooks/use-parent-portal";
import { OrgLogo } from "../components/branding/OrgLogo";
import { DailyBriefing } from "../components/DailyBriefing";
import { FeedbackWidget } from "../components/feedback/FeedbackWidget";
import { LockedFeaturePage } from "../components/subscription/LockedFeaturePage";
import { parsePlanLockError } from "../lib/plan-lock";
import { useTheme } from "../contexts/ThemeContext";

const NAV_ITEMS = [
  { to: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/parent/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/parent/homework", label: "Homework", icon: ClipboardList },
  { to: "/parent/teachers", label: "Teachers", icon: Users },
  { to: "/parent/payments", label: "Payments", icon: Banknote },
];

export function ParentLayout() {
  const navigate = useNavigate();
  const parent = useParentAuthStore((state) => state.parent);
  const logout = useParentAuthStore((state) => state.logout);
  const parentLogout = useParentLogout();
  const { branding } = useTheme();
  const probe = useParentDashboard();
  const lockInfo = parsePlanLockError(probe.error);

  async function handleLogout() {
    try {
      await parentLogout.mutateAsync();
    } finally {
      logout();
      navigate("/parent/login");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-primary/10 bg-primary/5 px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <OrgLogo logoUrl={branding?.logoUrl} name={branding?.name} className="h-8 w-8" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Welcome, {parent?.parentName ?? "Parent"}!</p>
              <p className="text-xs text-slate-500">Your child: {parent?.studentName}</p>
              <p className="text-xs text-slate-400">{parent?.organizationName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 pb-20">
        {lockInfo ? <LockedFeaturePage featureName="Parent Portal" requiredPlan={lockInfo.requiredPlan} /> : <Outlet />}
      </main>

      {!lockInfo && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  isActive ? "text-primary" : "text-slate-500"
                }`
              }
            >
              <Icon size={22} className="min-h-[24px] min-w-[24px]" />
              {label}
            </NavLink>
          ))}
        </nav>
      )}

      {!lockInfo && <DailyBriefing role="parent" dashboardHref="/parent/dashboard" />}
      {!lockInfo && parent && (
        <FeedbackWidget basePath="parent/support-tickets" profile={{ name: parent.parentName ?? "Parent" }} />
      )}
    </div>
  );
}
