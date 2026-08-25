import { CalendarClock, ClipboardList, Lock, Sparkles, UsersRound, type LucideIcon } from "lucide-react";
import { parsePlanLockError } from "../../lib/plan-lock";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TodaysClassesWidget } from "../../components/calendar/TodaysClassesWidget";
import { StudentHomeworkListModal } from "../../components/homework/StudentHomeworkListModal";
import { MyStudentsModal } from "../../components/teacher/MyStudentsModal";
import { MySalaryCard } from "../../components/salary/MySalaryCard";
import { useCalendar } from "../../hooks/use-calendar";
import { useStudentHomework } from "../../hooks/use-homework";
import { useTestSummary } from "../../hooks/use-ai-test-generator";
import { useGroupStudents, useMyGroups } from "../../hooks/use-teacher-dashboard";
import { getMondayIso } from "../../lib/week";
import { useTranslation } from "../../hooks/use-translation";

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  onClick?: () => void;
}

function StatCard({ label, value, icon: Icon, onClick }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <Icon size={18} />
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value ?? "-"}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:bg-slate-50"
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{content}</div>;
}

// Student login/portal doesn't exist yet — this previews the "My Homework"
// student-facing view against the first student in the teacher's first
// group, purely so the homework feature can be exercised end-to-end.
function StudentHomeworkPreviewCard() {
  const { t } = useTranslation();
  const { data: groups } = useMyGroups();
  const firstGroupId = groups?.[0]?.id;
  const { data: students } = useGroupStudents(firstGroupId ?? "");
  const previewStudent = students?.[0];
  const { data: homework, isLoading } = useStudentHomework(previewStudent?.id ?? null);
  const [open, setOpen] = useState(false);

  const pendingCount = (homework ?? []).filter(
    (h) => h.submissionStatus === "pending" || h.submissionStatus === "late",
  ).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!previewStudent}
        className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">{t("My Homework")}</span>
          <ClipboardList size={18} />
        </div>
        <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{isLoading ? "-" : pendingCount}</p>
        <p className="mt-1 text-xs text-slate-400">
          {previewStudent ? `Student preview: ${previewStudent.name}` : "No students to preview yet"}
        </p>
      </button>

      <StudentHomeworkListModal
        open={open}
        onClose={() => setOpen(false)}
        studentId={previewStudent?.id ?? null}
        studentName={previewStudent?.name}
      />
    </>
  );
}

function AiTestGeneratorWidget() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useTestSummary();
  const lockInfo = parsePlanLockError(error);

  if (lockInfo) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">{t("AI Test Generator")}</p>
              <p className="text-sm text-slate-400">Requires the {lockInfo.requiredPlan} plan or higher</p>
            </div>
          </div>
          <Link
            to="/settings/plan"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {t("Upgrade to unlock")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("AI Test Generator")}</p>
            <p className="text-sm text-slate-500">
              {isLoading ? "-" : data?.countThisMonth ?? 0} tests created this month
              {!isLoading && ` · ${data?.submissionsThisWeek ?? 0} submissions this week`}
            </p>
          </div>
        </div>
        <Link
          to="/teacher/ai-tests/generate"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          {t("Generate New Test")}
        </Link>
      </div>

      {data && data.recentTests.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {data.recentTests.map((t) => (
            <Link
              key={t.id}
              to="/teacher/ai-tests"
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
            >
              <span className="truncate font-medium text-slate-800 dark:text-slate-200">{t.title}</span>
              <span className="shrink-0 text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeacherDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: groups, isLoading: groupsLoading } = useMyGroups();
  const todayIso = new Date().toISOString().slice(0, 10);
  const calendar = useCalendar(getMondayIso(new Date()), {});
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);

  const totalStudents = groups?.reduce((sum, g) => sum + g.studentCount, 0) ?? 0;
  const todaysSessions = calendar.data?.days.find((d) => d.date === todayIso)?.sessions;
  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("My Dashboard")}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label={t("My Groups")} value={groups?.length} icon={UsersRound} />
            <StatCard
              label={t("Total Students")}
              value={totalStudents}
              icon={UsersRound}
              onClick={() => setStudentsModalOpen(true)}
            />
            <StatCard label={t("Today's Classes")} value={todaysSessions?.length} icon={CalendarClock} />
          </div>

          <div className="mb-8">
            <StudentHomeworkPreviewCard />
          </div>

          <div className="mb-8">
            <AiTestGeneratorWidget />
          </div>

          <TodaysClassesWidget
            dateLabel={todayLabel}
            sessions={todaysSessions}
            isLoading={groupsLoading || calendar.isLoading}
            onSessionClick={(session) => {
              if (session.group) navigate(`/teacher/groups/${session.group.id}?tab=attendance`);
            }}
          />
        </div>

        <div>
          <MySalaryCard />
        </div>
      </div>

      <MyStudentsModal open={studentsModalOpen} onClose={() => setStudentsModalOpen(false)} />
    </div>
  );
}
