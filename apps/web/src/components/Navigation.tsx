import { NavLink, useNavigate } from "react-router-dom";
import type { PlanModule } from "@crm/shared-types";
import {
  BarChart3,
  Banknote,
  BellRing,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  History,
  LayoutDashboard,
  Lock,
  MessageCircle,
  Palette,
  CreditCard,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useCurrentSubscription } from "../hooks/use-subscription";
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "../hooks/use-translation";
import type { TranslationKey } from "../i18n/translations";

// Reception no longer uses this shared admin navigation at all — they land
// on their own /reception/* route tree (ReceptionLayout) with a separate,
// smaller nav. Keeping "reception" out of every role list here is defense
// in depth on top of the route guards.
const NAV_ITEMS: {
  to: string;
  label: string;
  translationKey?: TranslationKey;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles: string[];
  requiredModule?: PlanModule;
  requiresBranches?: boolean;
}[] = [
  { to: "/", label: "Dashboard", translationKey: "dashboard", icon: LayoutDashboard, end: true, roles: ["owner", "admin"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["owner", "admin"], requiredModule: "analytics" as PlanModule },
  { to: "/branches", label: "Branches", icon: Building2, roles: ["owner", "admin"], requiresBranches: true },
  { to: "/teachers", label: "Teachers", translationKey: "teachers", icon: GraduationCap, roles: ["owner", "admin"] },
  { to: "/teachers/salaries", label: "Teacher Salaries", icon: Wallet, roles: ["owner", "admin"] },
  // Newcomers/Students/Courses/Attendance are receptionist-only on the
  // shared owner+admin nav — owner uses the reception role's dashboard for
  // these, so "owner" is deliberately absent from their roles lists here.
  { to: "/newcomers", label: "Newcomers", translationKey: "newcomers", icon: UserPlus, roles: ["admin", "manager"] },
  { to: "/students", label: "Students", translationKey: "students", icon: Users, roles: ["admin", "manager"] },
  { to: "/parents", label: "Parents", icon: UserRound, roles: ["owner", "admin", "manager"] },
  { to: "/courses", label: "Courses", translationKey: "courses", icon: BookOpen, roles: ["admin"] },
  { to: "/groups", label: "Groups", translationKey: "groups", icon: UsersRound, roles: ["owner", "admin", "manager"] },
  { to: "/schedule", label: "Schedule", translationKey: "schedules", icon: CalendarDays, roles: ["admin", "manager"] },
  { to: "/calendar", label: "Calendar", icon: Calendar, roles: ["admin", "manager"] },
  { to: "/attendance", label: "Attendance", translationKey: "attendance", icon: ClipboardCheck, roles: ["admin", "manager"] },
  { to: "/finance", label: "Finance", translationKey: "finance", icon: Banknote, roles: ["owner", "admin"] },
  {
    to: "/finance/overdue",
    label: "Overdue Payments",
    icon: BellRing,
    roles: ["owner", "admin"],
    requiredModule: "payment_reminders" as PlanModule,
  },
  { to: "/settings/branding", label: "Branding", icon: Palette, roles: ["owner", "admin"] },
  { to: "/settings/plan", label: "Plan & Billing", icon: CreditCard, roles: ["owner", "admin"] },
  { to: "/support-tickets", label: "Support Tickets", icon: MessageCircle, roles: ["owner", "admin"] },
  { to: "/audit-log", label: "Audit Log", icon: History, roles: ["admin"] },
];

export function Navigation({ role }: { role?: string | null }) {
  const navigate = useNavigate();
  const { branding } = useTheme();
  const { t } = useTranslation();
  // Only the authenticated (full) branding shape carries hasBranches — this
  // component is only ever rendered inside the authenticated staff shell.
  const hasBranches = (branding as { hasBranches?: boolean } | null)?.hasBranches ?? true;
  const items = NAV_ITEMS.filter(
    (item) => (!role || item.roles.includes(role)) && (!item.requiresBranches || hasBranches),
  );
  const { data: subscription } = useCurrentSubscription(role === "owner" || role === "admin");

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map(({ to, label, translationKey, icon: Icon, end, requiredModule }) => {
        const locked = requiredModule && subscription && !subscription.allowedModules.includes(requiredModule);
        const displayLabel = translationKey ? t(translationKey) : label;

        if (locked) {
          return (
            <button
              key={to}
              onClick={() => navigate("/settings/plan")}
              title="Upgrade to unlock"
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-700"
            >
              <span className="flex items-center gap-3">
                <Icon size={18} />
                {displayLabel}
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
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              }`
            }
          >
            <Icon size={18} />
            {displayLabel}
          </NavLink>
        );
      })}
    </nav>
  );
}
