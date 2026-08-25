import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Banknote, CalendarDays, ClipboardList, FileCheck2, LayoutDashboard, LogOut, User } from "lucide-react";
import { useStudentAuthStore } from "../stores/student-auth.store";
import { useStudentLogout } from "../hooks/use-student-portal";
import { OrgLogo } from "../components/branding/OrgLogo";
import { DailyBriefing } from "../components/DailyBriefing";
import { FeedbackWidget } from "../components/feedback/FeedbackWidget";
import { useTheme } from "../contexts/ThemeContext";
import { resolveOrgDisplayName } from "../lib/theme";
import { StudentNotificationBell } from "../components/notifications/StudentNotificationBell";
import { useTranslation } from "../hooks/use-translation";

const NAV_ITEMS = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/student/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/student/homework", label: "Homework", icon: ClipboardList },
  { to: "/student/tests", label: "My Tests", icon: FileCheck2 },
  { to: "/student/payments", label: "Payments", icon: Banknote },
  { to: "/student/profile", label: "Profile", icon: User },
];

export function StudentLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const student = useStudentAuthStore((state) => state.student);
  const logout = useStudentAuthStore((state) => state.logout);
  const studentLogout = useStudentLogout();
  const { branding } = useTheme();

  async function handleLogout() {
    try {
      await studentLogout.mutateAsync();
    } finally {
      logout();
      navigate("/login");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-primary/10 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <OrgLogo
            logoUrl={branding?.logoUrl}
            logoDarkUrl={branding?.logoDarkUrl}
            name={resolveOrgDisplayName(branding)}
            className="h-8 w-8"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">{student?.name}</p>
            <p className="text-xs text-slate-500">{resolveOrgDisplayName(branding)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StudentNotificationBell />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={16} />
            {t("Logout")}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 pb-20">
        <Outlet />
      </main>

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
            {t(label)}
          </NavLink>
        ))}
      </nav>

      <DailyBriefing role="student" dashboardHref="/student" />
      {student && (
        <FeedbackWidget
          basePath="student/support-tickets"
          profile={{ name: student.name, email: student.email, phone: student.phone }}
        />
      )}
    </div>
  );
}
