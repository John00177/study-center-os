import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./lib/api";
import { useAuthStore } from "./stores/auth.store";
import { useStudentAuthStore } from "./stores/student-auth.store";
import { useParentAuthStore } from "./stores/parent-auth.store";
import { usePushRegistration } from "./hooks/use-push-registration";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { TeacherLayout } from "./layouts/TeacherLayout";
import { ReceptionLayout } from "./layouts/ReceptionLayout";
import { StudentLayout } from "./layouts/StudentLayout";
import { ParentLayout } from "./layouts/ParentLayout";
import { PlatformAdminLayout } from "./layouts/PlatformAdminLayout";
import { OwnerLoginPage } from "./pages/OwnerLoginPage";
import { TeacherLoginPage } from "./pages/TeacherLoginPage";
import { ReceptionLoginPage } from "./pages/ReceptionLoginPage";
import { ParentLoginPage } from "./pages/ParentLoginPage";
import { PlatformAdminLoginPage } from "./pages/PlatformAdminLoginPage";
import { PublicSignupPage } from "./pages/PublicSignupPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { StudentChangePasswordPage } from "./pages/student/StudentChangePasswordPage";
import { ParentChangePasswordPage } from "./pages/parent/ParentChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReceptionDashboardPage } from "./pages/ReceptionDashboardPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { BrandingSettingsPage } from "./pages/BrandingSettingsPage";
import { PlanAndBillingPage } from "./pages/PlanAndBillingPage";
import { BranchesPage } from "./pages/BranchesPage";
import { TeachersPage } from "./pages/TeachersPage";
import { TeacherSalariesPage } from "./pages/TeacherSalariesPage";
import { StudentsPage } from "./pages/StudentsPage";
import { NewcomersPage } from "./pages/NewcomersPage";
import { ParentsPage } from "./pages/ParentsPage";
import { CoursesPage } from "./pages/CoursesPage";
import { ReceptionTeachersPage } from "./pages/ReceptionTeachersPage";
import { GroupsPage } from "./pages/GroupsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { CalendarPage } from "./pages/CalendarPage";
import { AttendancePage } from "./pages/AttendancePage";
import { FinancePage } from "./pages/FinancePage";
import { OverduePaymentsPage } from "./pages/OverduePaymentsPage";
import { ReminderHistoryPage } from "./pages/ReminderHistoryPage";
import { TeacherDashboardPage } from "./pages/teacher/TeacherDashboardPage";
import { TeacherSalaryPage } from "./pages/teacher/TeacherSalaryPage";
import { TeacherGroupsPage } from "./pages/teacher/TeacherGroupsPage";
import { GroupDetailPage } from "./pages/teacher/GroupDetailPage";
import { TeacherSchedulePage } from "./pages/teacher/TeacherSchedulePage";
import { AiTestGeneratorPage } from "./pages/teacher/AiTestGeneratorPage";
import { MyTestsPage } from "./pages/teacher/MyTestsPage";
import { TestResultsPage } from "./pages/teacher/TestResultsPage";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import { StudentSchedulePage } from "./pages/student/StudentSchedulePage";
import { StudentHomeworkPage } from "./pages/student/StudentHomeworkPage";
import { StudentTestsPage } from "./pages/student/StudentTestsPage";
import { TakeTestPage } from "./pages/student/TakeTestPage";
import { TestResultPage } from "./pages/student/TestResultPage";
import { StudentPaymentsPage } from "./pages/student/StudentPaymentsPage";
import { StudentProfilePage } from "./pages/student/StudentProfilePage";
import { ParentDashboardPage } from "./pages/parent/ParentDashboardPage";
import { ParentSchedulePage } from "./pages/parent/ParentSchedulePage";
import { ParentHomeworkPage } from "./pages/parent/ParentHomeworkPage";
import { ParentTeachersPage } from "./pages/parent/ParentTeachersPage";
import { ParentPaymentsPage } from "./pages/parent/ParentPaymentsPage";
import { PlatformAdminDashboardPage } from "./pages/platform-admin/PlatformAdminDashboardPage";
import { StudyCentersPage } from "./pages/platform-admin/StudyCentersPage";
import { ApplicationsPage } from "./pages/platform-admin/ApplicationsPage";
import { PlatformRevenuePage } from "./pages/platform-admin/PlatformRevenuePage";
import { PlatformHealthPage } from "./pages/platform-admin/PlatformHealthPage";
import { SupportTicketsPage as AdminSupportTicketsPage } from "./pages/platform-admin/SupportTicketsPage";
import { OrgSupportTicketsPage } from "./pages/support-tickets/OrgSupportTicketsPage";

// Each portal is a dead end for the wrong role — a mismatched login doesn't
// bounce sideways into some other dashboard, it goes back to /login (or
// /platform/login for the admin portal) and makes the user pick the right
// door. This is deliberately stricter than the old single-portal app, where
// owner/admin could also peek at /teacher and /reception.

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  if (user.role === "teacher") {
    return <Navigate to="/teacher" replace />;
  }
  if (user.role === "reception") {
    return <Navigate to="/reception" replace />;
  }
  if (user.role === "platform_admin") {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

function RequireReceptionAccess({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!user || user.role !== "reception") {
    return <Navigate to="/login" replace />;
  }
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  return <>{children}</>;
}

function RequireOwnerOrAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== "owner" && user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="mb-2 text-lg font-semibold text-slate-900">Access restricted</h1>
          <p className="text-sm text-slate-500">This page is only available to owners and admins.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function RequireTeacherAccess({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!user || user.role !== "teacher") {
    return <Navigate to="/login" replace />;
  }
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  // Account active + dashboard suspended still can't use the dashboard.
  if (!user.isTeacherDashboardActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="mb-2 text-lg font-semibold text-slate-900">Teacher dashboard not activated</h1>
          <p className="text-sm text-slate-500">
            Your teacher dashboard access has not been activated yet. Ask an admin to activate it.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function RequireStudentAuth({ children }: { children: ReactNode }) {
  const student = useStudentAuthStore((state) => state.student);
  if (!student) {
    return <Navigate to="/login" replace />;
  }
  if (student.mustChangePassword) {
    return <Navigate to="/student/change-password" replace />;
  }
  return <>{children}</>;
}

function RequireParentAuth({ children }: { children: ReactNode }) {
  const parent = useParentAuthStore((state) => state.parent);
  if (!parent) {
    return <Navigate to="/parent/login" replace />;
  }
  if (parent.mustChangePassword) {
    return <Navigate to="/parent/change-password" replace />;
  }
  return <>{children}</>;
}

// Guards the three change-password pages themselves: must be logged in as
// that identity type, AND must actually have a pending forced change —
// otherwise there's nothing to do here, so bounce to the real dashboard.
function RequireOwnerPasswordChange({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.mustChangePassword) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireStudentPasswordChange({ children }: { children: ReactNode }) {
  const student = useStudentAuthStore((state) => state.student);
  if (!student) {
    return <Navigate to="/login" replace />;
  }
  if (!student.mustChangePassword) {
    return <Navigate to="/student" replace />;
  }
  return <>{children}</>;
}

function RequireParentPasswordChange({ children }: { children: ReactNode }) {
  const parent = useParentAuthStore((state) => state.parent);
  if (!parent) {
    return <Navigate to="/parent/login" replace />;
  }
  if (!parent.mustChangePassword) {
    return <Navigate to="/parent" replace />;
  }
  return <>{children}</>;
}

function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!user || user.role !== "platform_admin") {
    return <Navigate to="/platform/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const setStudent = useStudentAuthStore((state) => state.setStudent);
  const setParent = useParentAuthStore((state) => state.setParent);
  const [checking, setChecking] = useState(true);
  usePushRegistration(Boolean(user));

  useEffect(() => {
    api
      .get("/auth/me")
      .then((response) => {
        setUser(response.data);
      })
      .catch(() =>
        api
          .get("/auth/student-me")
          .then((response) => setStudent(response.data))
          .catch(() =>
            api
              .get("/auth/parent-me")
              .then((response) => setParent(response.data))
              .catch(() => {
                setUser(null);
                setStudent(null);
                setParent(null);
              }),
          ),
      )
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return null;
  }

  return (
    <Routes>
      <Route path="/login" element={<OwnerLoginPage />} />
      <Route path="/teacher/login" element={<TeacherLoginPage />} />
      <Route path="/reception/login" element={<ReceptionLoginPage />} />
      <Route path="/parent/login" element={<ParentLoginPage />} />
      <Route path="/platform/login" element={<PlatformAdminLoginPage />} />
      <Route path="/signup" element={<PublicSignupPage />} />
      <Route
        path="/change-password"
        element={
          <RequireOwnerPasswordChange>
            <ChangePasswordPage />
          </RequireOwnerPasswordChange>
        }
      />
      <Route
        path="/student/change-password"
        element={
          <RequireStudentPasswordChange>
            <StudentChangePasswordPage />
          </RequireStudentPasswordChange>
        }
      />
      <Route
        path="/parent/change-password"
        element={
          <RequireParentPasswordChange>
            <ParentChangePasswordPage />
          </RequireParentPasswordChange>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="analytics"
          element={
            <RequireOwnerOrAdmin>
              <AnalyticsPage />
            </RequireOwnerOrAdmin>
          }
        />
        <Route path="branches" element={<BranchesPage />} />
        <Route
          path="settings/branding"
          element={
            <RequireOwnerOrAdmin>
              <BrandingSettingsPage />
            </RequireOwnerOrAdmin>
          }
        />
        <Route
          path="settings/plan"
          element={
            <RequireOwnerOrAdmin>
              <PlanAndBillingPage />
            </RequireOwnerOrAdmin>
          }
        />
        <Route
          path="support-tickets"
          element={
            <RequireOwnerOrAdmin>
              <OrgSupportTicketsPage />
            </RequireOwnerOrAdmin>
          }
        />
        <Route path="teachers" element={<TeachersPage />} />
        <Route
          path="teachers/salaries"
          element={
            <RequireOwnerOrAdmin>
              <TeacherSalariesPage />
            </RequireOwnerOrAdmin>
          }
        />
        <Route path="newcomers" element={<NewcomersPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="parents" element={<ParentsPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="finance/overdue" element={<OverduePaymentsPage />} />
        <Route path="finance/reminders" element={<ReminderHistoryPage />} />
      </Route>

      <Route
        path="/reception"
        element={
          <RequireReceptionAccess>
            <ReceptionLayout />
          </RequireReceptionAccess>
        }
      >
        <Route index element={<ReceptionDashboardPage />} />
        <Route path="newcomers" element={<NewcomersPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="teachers" element={<ReceptionTeachersPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="finance/overdue" element={<OverduePaymentsPage />} />
      </Route>

      <Route
        path="/teacher"
        element={
          <RequireTeacherAccess>
            <TeacherLayout />
          </RequireTeacherAccess>
        }
      >
        <Route index element={<TeacherDashboardPage />} />
        <Route path="salary" element={<TeacherSalaryPage />} />
        <Route path="groups" element={<TeacherGroupsPage />} />
        <Route path="groups/:id" element={<GroupDetailPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="ai-tests/generate" element={<AiTestGeneratorPage />} />
        <Route path="ai-tests" element={<MyTestsPage />} />
        <Route path="ai-tests/:id/results" element={<TestResultsPage />} />
        <Route path="schedule" element={<TeacherSchedulePage />} />
      </Route>

      <Route
        path="/student"
        element={
          <RequireStudentAuth>
            <StudentLayout />
          </RequireStudentAuth>
        }
      >
        <Route index element={<StudentDashboardPage />} />
        <Route path="schedule" element={<StudentSchedulePage />} />
        <Route path="homework" element={<StudentHomeworkPage />} />
        <Route path="tests" element={<StudentTestsPage />} />
        <Route path="tests/:id/take" element={<TakeTestPage />} />
        <Route path="tests/:id/result" element={<TestResultPage />} />
        <Route path="payments" element={<StudentPaymentsPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
      </Route>

      <Route
        path="/parent"
        element={
          <RequireParentAuth>
            <ParentLayout />
          </RequireParentAuth>
        }
      >
        <Route index element={<Navigate to="/parent/dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboardPage />} />
        <Route path="schedule" element={<ParentSchedulePage />} />
        <Route path="homework" element={<ParentHomeworkPage />} />
        <Route path="teachers" element={<ParentTeachersPage />} />
        <Route path="payments" element={<ParentPaymentsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequirePlatformAdmin>
            <PlatformAdminLayout />
          </RequirePlatformAdmin>
        }
      >
        <Route index element={<PlatformAdminDashboardPage />} />
        <Route path="study-centers" element={<StudyCentersPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="revenue" element={<PlatformRevenuePage />} />
        <Route path="health" element={<PlatformHealthPage />} />
        <Route path="support-tickets" element={<AdminSupportTicketsPage />} />
      </Route>
    </Routes>
  );
}
