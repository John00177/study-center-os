import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type {
  OwnerBriefingDto,
  ParentBriefingDto,
  PlatformAdminBriefingDto,
  ReceptionBriefingDto,
  StudentBriefingDto,
  TeacherBriefingDto,
} from "@crm/shared-types";
import { AnimatedStatCard } from "./AnimatedStatCard";
import { CircularProgress } from "./CircularProgress";
import type { DailyBriefingRole } from "../hooks/use-daily-briefing";
import { useTranslation } from "../hooks/use-translation";

export type BriefingData =
  | { role: "owner"; data: OwnerBriefingDto }
  | { role: "reception"; data: ReceptionBriefingDto }
  | { role: "teacher"; data: TeacherBriefingDto }
  | { role: "student"; data: StudentBriefingDto }
  | { role: "parent"; data: ParentBriefingDto }
  | { role: "platform_admin"; data: PlatformAdminBriefingDto };

interface DailyBriefingModalProps {
  briefing: BriefingData;
  onDismiss: (dontShowAgainToday: boolean) => void;
  dashboardHref: string;
}

interface StatEntry {
  icon: LucideIcon;
  value: number;
  label: string;
  urgent?: boolean;
  formatValue?: (value: number) => string;
}

function statsFor(briefing: BriefingData): StatEntry[] {
  switch (briefing.role) {
    case "owner": {
      const s = briefing.data.stats;
      return [
        { icon: Calendar, value: s.todayClasses, label: "Classes today" },
        { icon: Users, value: s.todayStudents, label: "Active students" },
        { icon: DollarSign, value: s.pendingPayments, label: "Pending payments", urgent: s.pendingPayments > 0 },
        { icon: TrendingUp, value: s.pendingApprovals, label: "Newcomers to convert", urgent: s.pendingApprovals > 0 },
        { icon: AlertCircle, value: s.lowAttendanceAlert, label: "Low attendance alerts", urgent: s.lowAttendanceAlert > 0 },
      ];
    }
    case "reception": {
      const s = briefing.data.stats;
      return [
        { icon: UserPlus, value: s.todayNewcomers, label: "New today" },
        { icon: Clock, value: s.pendingConversions, label: "Pending conversions", urgent: s.pendingConversions > 0 },
        { icon: DollarSign, value: s.overduePayments, label: "Overdue payments", urgent: s.overduePayments > 0 },
        { icon: Users, value: s.todayClasses, label: "Classes today" },
      ];
    }
    case "teacher": {
      const s = briefing.data.stats;
      return [
        { icon: Calendar, value: s.todayClasses, label: "Classes today" },
        { icon: Users, value: s.totalStudents, label: "Total students" },
        { icon: CheckCircle, value: s.attendancePending, label: "Attendance to mark", urgent: s.attendancePending > 0 },
        { icon: BookOpen, value: s.testsToGrade, label: "Tests to review", urgent: s.testsToGrade > 0 },
      ];
    }
    case "student": {
      const s = briefing.data.stats;
      return [
        { icon: Calendar, value: s.todayClasses, label: "Classes today" },
        { icon: BookOpen, value: s.pendingHomework, label: "Homework due", urgent: s.pendingHomework > 0 },
        { icon: Wallet, value: s.balanceDue, label: "Balance due", urgent: s.balanceDue > 0 },
      ];
    }
    case "parent": {
      const s = briefing.data.stats;
      return [
        { icon: Calendar, value: s.todayClasses, label: "Classes today" },
        { icon: BookOpen, value: s.pendingHomework, label: "Homework due", urgent: s.pendingHomework > 0 },
        { icon: Wallet, value: s.balanceDue, label: "Balance due", urgent: s.balanceDue > 0 },
      ];
    }
    case "platform_admin": {
      const s = briefing.data.stats;
      return [
        { icon: Building, value: s.totalOrgs, label: "Study centers" },
        { icon: UserCheck, value: s.pendingApprovals, label: "Pending approvals", urgent: s.pendingApprovals > 0 },
        { icon: DollarSign, value: s.totalRevenue, label: "Total revenue" },
        { icon: Users, value: s.activeStudents, label: "Active students" },
      ];
    }
  }
}

export function DailyBriefingModal({ briefing, onDismiss, dashboardHref }: DailyBriefingModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const isDark = briefing.role === "platform_admin";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss(dontShowAgain);
    }
    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onDismiss, dontShowAgain]);

  const { greeting, date, quote, actions } = briefing.data;
  const stats = statsFor(briefing);
  const nextClass = "nextClass" in briefing.data ? briefing.data.nextClass : null;
  const teacherContacts = briefing.role === "parent" ? briefing.data.teacherContacts : null;
  const childName = briefing.role === "parent" ? briefing.data.stats.childName : null;
  const attendanceRate =
    briefing.role === "student" || briefing.role === "parent" ? briefing.data.stats.attendanceRate : null;

  function goToDashboard() {
    onDismiss(dontShowAgain);
    navigate(dashboardHref);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      } ${isDark ? "bg-slate-950/80" : "bg-gradient-to-br from-primary/10 via-white/80 to-white backdrop-blur-sm dark:from-primary/10 dark:via-slate-900/80 dark:to-slate-900"}`}
      onClick={() => onDismiss(dontShowAgain)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Daily briefing")}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-2xl p-6 shadow-2xl transition-all duration-400 ease-out sm:p-8 ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        } ${isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100"}`}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">{greeting}</h1>
          <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400"}`}>{date}</p>
          {childName && <p className="mt-1 text-sm font-medium text-primary">{childName}</p>}
          <p className={`mx-auto mt-4 max-w-md text-sm italic ${isDark ? "text-slate-400" : "text-slate-400"}`}>
            &ldquo;{quote}&rdquo;
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          {stats.map((stat, index) => (
            <AnimatedStatCard key={stat.label} delay={index * 100} {...stat} />
          ))}
        </div>

        {(nextClass || attendanceRate !== null) && (
          <div className={`mt-4 flex items-center gap-4 rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50"}`}>
            {attendanceRate !== null && (
              <CircularProgress
                value={Math.round(attendanceRate)}
                max={100}
                size={56}
                strokeWidth={5}
                colorClassName="text-primary"
                label={t("attendance")}
              />
            )}
            {nextClass && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Next class: {nextClass.groupName}</p>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {nextClass.time} · {nextClass.classroom}
                </p>
              </div>
            )}
          </div>
        )}

        {teacherContacts && teacherContacts.length > 0 && (
          <div className={`mt-4 rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50"}`}>
            <p className="text-sm font-semibold">{t("Teachers")}</p>
            <ul className="mt-2 space-y-1">
              {teacherContacts.map((t) => (
                <li key={t.name} className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {t.name}
                  {t.phone ? ` · ${t.phone}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {actions.length > 0 && (
          <div className="mt-4 space-y-2">
            {actions.map((action) => (
              <button
                key={t(action.label)}
                onClick={() => {
                  onDismiss(dontShowAgain);
                  navigate(action.href);
                }}
                className={`flex w-full items-center justify-between rounded-lg border-l-4 px-4 py-3 text-left text-sm transition ${
                  action.urgent
                    ? `border-l-red-500 ${isDark ? "bg-red-950/40 hover:bg-red-950/60" : "bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60"}`
                    : `border-l-primary ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700"}`
                }`}
              >
                <span className={`flex items-center gap-2 font-medium ${action.urgent ? "text-red-600" : isDark ? "text-slate-100" : "text-slate-700 dark:text-slate-300"}`}>
                  {t(action.label)}
                </span>
                <ArrowRight size={16} className={action.urgent ? "text-red-500" : "text-slate-400"} />
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={goToDashboard}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            {t("Go to Dashboard")}
          </button>
          <label className={`flex items-center justify-center gap-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400"}`}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
            />
            {t("Don't show again today")}
          </label>
        </div>
      </div>
    </div>
  );
}
