import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Banknote,
  BellRing,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserPlus,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { OfflineBanner } from "../components/OfflineBanner";
import { OrgLogo } from "../components/branding/OrgLogo";
import { DailyBriefing } from "../components/DailyBriefing";
import { FeedbackWidget } from "../components/feedback/FeedbackWidget";
import { useAuthStore } from "../stores/auth.store";
import { useTheme } from "../contexts/ThemeContext";
import { resolveOrgDisplayName } from "../lib/theme";
import { api } from "../lib/api";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
import { NotificationBell } from "../components/notifications/NotificationBell";
import { useTranslation } from "../hooks/use-translation";
import type { TranslationKey } from "../i18n/translations";

// Reception's own nav — deliberately separate from the shared admin
// Navigation component (same pattern as TeacherLayout): a small, fixed list
// rather than role-filtering a shared array, since reception's routes live
// under their own /reception/* prefix.
const NAV_ITEMS: { to: string; label: string; translationKey?: TranslationKey; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { to: "/reception", label: "Dashboard", translationKey: "dashboard", icon: LayoutDashboard, end: true },
  { to: "/reception/newcomers", label: "Newcomers", translationKey: "newcomers", icon: UserPlus },
  { to: "/reception/students", label: "Students", translationKey: "students", icon: Users },
  { to: "/reception/teachers", label: "Teachers", translationKey: "teachers", icon: GraduationCap },
  { to: "/reception/courses", label: "Courses", translationKey: "courses", icon: BookOpen },
  { to: "/reception/groups", label: "Groups", translationKey: "groups", icon: UsersRound },
  { to: "/reception/schedule", label: "Schedules", translationKey: "schedules", icon: CalendarDays },
  { to: "/reception/attendance", label: "Attendance", translationKey: "attendance", icon: ClipboardCheck },
  { to: "/reception/finance", label: "Finance", translationKey: "finance", icon: Banknote },
  { to: "/reception/finance/overdue", label: "Overdue Payments", icon: BellRing },
];

function ReceptionNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  return (
    <nav className="flex flex-col gap-1 p-3" onClick={onNavigate}>
      {NAV_ITEMS.map(({ to, label, translationKey, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-slate-600 hover:bg-primary/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            }`
          }
        >
          <Icon size={18} />
          {t(translationKey ?? label)}
        </NavLink>
      ))}
    </nav>
  );
}

export function ReceptionLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { branding } = useTheme();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await api.post("/auth/logout");
    logout();
    navigate("/reception/login");
  }

  const orgName = resolveOrgDisplayName(branding);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white sm:block dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-700">
          <OrgLogo logoUrl={branding?.logoUrl} logoDarkUrl={branding?.logoDarkUrl} name={orgName} className="h-8 w-8" />
          <span className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{orgName}</span>
        </div>
        <ReceptionNav />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="animate-fade-in absolute inset-y-0 left-0 w-64 bg-white shadow-xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <OrgLogo logoUrl={branding?.logoUrl} logoDarkUrl={branding?.logoDarkUrl} name={orgName} className="h-7 w-7" />
                <span className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{orgName}</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label={t("Close menu")}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ReceptionNav onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <OfflineBanner />
        <header className="flex items-center justify-between border-b border-primary/10 bg-primary/5 px-4 py-3 sm:px-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label={t("Open menu")}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 sm:hidden dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 sm:hidden">
              <OrgLogo logoUrl={branding?.logoUrl} logoDarkUrl={branding?.logoDarkUrl} name={orgName} className="h-6 w-6" />
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{orgName}</span>
            </div>
            <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">{orgName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm font-medium text-slate-700 sm:inline dark:text-slate-300">{user?.name}</span>
            <NotificationBell canSend />
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>

      <DailyBriefing role="reception" dashboardHref="/reception" />
      {user && <FeedbackWidget basePath="support-tickets" profile={{ name: user.name, email: user.email }} />}
    </div>
  );
}
