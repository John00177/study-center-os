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

// Reception no longer uses this shared admin navigation at all — they land
// on their own /reception/* route tree (ReceptionLayout) with a separate,
// smaller nav. Keeping "reception" out of every role list here is defense
// in depth on top of the route guards.
const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, roles: ["owner", "admin"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["owner", "admin"], requiredModule: "analytics" as PlanModule },
  { to: "/branches", label: "Branches", icon: Building2, roles: ["owner", "admin"] },
  { to: "/teachers", label: "Teachers", icon: GraduationCap, roles: ["owner", "admin"] },
  { to: "/teachers/salaries", label: "Teacher Salaries", icon: Wallet, roles: ["owner", "admin"] },
  { to: "/newcomers", label: "Newcomers", icon: UserPlus, roles: ["owner", "admin", "manager"] },
  { to: "/students", label: "Students", icon: Users, roles: ["owner", "admin", "manager"] },
  { to: "/parents", label: "Parents", icon: UserRound, roles: ["owner", "admin", "manager"] },
  { to: "/courses", label: "Courses", icon: BookOpen, roles: ["owner", "admin"] },
  { to: "/groups", label: "Groups", icon: UsersRound, roles: ["owner", "admin", "manager"] },
  { to: "/schedule", label: "Schedule", icon: CalendarDays, roles: ["owner", "admin", "manager"] },
  { to: "/calendar", label: "Calendar", icon: Calendar, roles: ["owner", "admin", "manager"] },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["owner", "admin", "manager"] },
  { to: "/finance", label: "Finance", icon: Banknote, roles: ["owner", "admin"] },
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
  { to: "/audit-log", label: "Audit Log", icon: History, roles: ["owner", "admin"] },
];

export function Navigation({ role }: { role?: string | null }) {
  const navigate = useNavigate();
  const items = role ? NAV_ITEMS.filter((item) => item.roles.includes(role)) : NAV_ITEMS;
  const { data: subscription } = useCurrentSubscription(role === "owner" || role === "admin");

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map(({ to, label, icon: Icon, end, requiredModule }) => {
        const locked = requiredModule && subscription && !subscription.allowedModules.includes(requiredModule);

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
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}
