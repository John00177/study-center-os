import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { Navigation } from "../components/Navigation";
import { OfflineBanner } from "../components/OfflineBanner";
import { OrgLogo } from "../components/branding/OrgLogo";
import { DailyBriefing } from "../components/DailyBriefing";
import { FeedbackWidget } from "../components/feedback/FeedbackWidget";
import { useAuthStore, useUserRole } from "../stores/auth.store";
import { useTheme } from "../contexts/ThemeContext";
import { resolveOrgDisplayName } from "../lib/theme";
import { api } from "../lib/api";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
import { useTranslation } from "../hooks/use-translation";
import { NotificationBell } from "../components/notifications/NotificationBell";

export function DashboardLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const role = useUserRole();
  const { branding } = useTheme();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await api.post("/auth/logout");
    logout();
    navigate("/login");
  }

  const orgName = resolveOrgDisplayName(branding);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white sm:block dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-700">
          <OrgLogo logoUrl={branding?.logoUrl} logoDarkUrl={branding?.logoDarkUrl} name={orgName} className="h-8 w-8" />
          <span className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{orgName}</span>
        </div>
        <Navigation role={role} />
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
                aria-label="Close menu"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div onClick={() => setMenuOpen(false)}>
              <Navigation role={role} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <OfflineBanner />
        <header className="flex items-center justify-between border-b border-primary/10 bg-primary/5 px-4 py-3 sm:px-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
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

      <DailyBriefing role="owner" dashboardHref="/" />
      {user && <FeedbackWidget basePath="support-tickets" profile={{ name: user.name, email: user.email }} />}
    </div>
  );
}
