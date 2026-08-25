export type OrganizationStatus = "active" | "suspended" | "trial" | "pending";
export type UserStatus = "active" | "suspended" | "pending";
export type TeamMemberStatus = "active" | "invited" | "suspended";

export type BranchStatus = "active" | "inactive";
export type DashboardStatus = "not_activated" | "active" | "suspended";
export type GroupStatus = "active" | "inactive" | "completed";
export type AssignmentRole = "primary" | "assistant" | "substitute";
export type AssignmentStatus = "active" | "ended";
export type MembershipStatus = "active" | "completed" | "dropped";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type AccountType = "cash_desk" | "bank_account" | "card_terminal" | "other";
export type ChargeStatus = "pending" | "paid" | "overdue" | "cancelled";
export type TransactionDirection = "debit" | "credit";
export type EnrollmentStatus = "enrolled" | "not_enrolled";
export type StudentStatus = "newcomer" | "active" | "dropped" | "completed" | "archived";
export type HomeworkStatus = "active" | "completed" | "cancelled";
export type SubmissionStatus = "pending" | "submitted" | "graded" | "late";
export type CourseCategory =
  | "language"
  | "mathematics"
  | "science"
  | "it_computer"
  | "arts"
  | "music"
  | "sports"
  | "preparation"
  | "other";

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  settings: Record<string, unknown>;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  hasBranches: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ThemeMode = "light" | "dark" | "auto";
export type UiLanguage = "uz" | "en" | "ru";

/** GET /organizations/branding?slug= — public, shown on login pages before auth. */
export interface OrganizationBrandingDto {
  name: string;
  slug: string;
  displayName: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  faviconUrl: string | null;
  loginBgUrl: string | null;
}

/** GET /organizations/me/branding — authenticated, includes preferences. */
export interface OrganizationFullBrandingDto extends OrganizationBrandingDto {
  theme: ThemeMode;
  language: UiLanguage;
  dateFormat: string;
  timeFormat: string;
  customDomain: string | null;
  // Single-branch orgs (the default) collapse branch pickers out of the UI —
  // see Navigation.tsx, DashboardPage.tsx, GroupsPage.tsx, FinancePage.tsx.
  hasBranches: boolean;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDto {
  id: string;
  organizationId: string | null;
  name: string;
  slug: string;
  isSystem: boolean;
}

export type PortalRole = "owner" | "teacher" | "reception" | "platform_admin";

export interface AuthenticatedUserDto {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  role: string | null;
  organizationSlug: string | null;
  isPlatformAdmin: boolean;
  isTeacherDashboardActive: boolean;
  mustChangePassword: boolean;
}

export interface AuditLogDto {
  id: string;
  organizationId: string;
  actorId: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue?: Record<string, unknown> | null;
  afterValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogListDto {
  items: AuditLogDto[];
  total: number;
}

export interface BranchDto {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  status: BranchStatus;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherGroupSummary {
  id: string;
  name: string;
  courseName: string | null;
  branchName: string | null;
}

export interface TeacherDto {
  id: string;
  organizationId: string;
  userId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  specialization?: string | null;
  dashboardStatus: DashboardStatus;
  activeGroupCount: number;
  activeStudentCount: number;
  mustChangePassword: boolean;
  // Present only on GET /teachers/:id (detail view), not the list.
  groups?: TeacherGroupSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherResultDto {
  teacher: TeacherDto;
  tempPassword: string;
}

export interface StudentDto {
  id: string;
  organizationId: string;
  name: string;
  // Login identifier for the student portal — no longer collected on the
  // newcomer/student forms (socialAccount replaces it there), but still set
  // via the reception "direct" flow and used by validateStudentCredentials.
  email?: string | null;
  socialAccount?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  status: StudentStatus;
  notes?: string | null;
  interestedCourse?: string | null;
  gender?: string | null;
  // Deprecated — no longer collected or shown on any form.
  leadSource?: string | null;
  medicalCard?: boolean | null;
  parentName?: string | null;
  parentEmail?: string | null;
  parentPhone?: string | null;
  mustChangePassword: boolean;
  stage: string;
  registeredAt: string;
  convertedAt?: string | null;
  activeGroupCount: number;
  enrollmentStatus: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
}

// GroupDto and AuditLogDto are declared further down this file — TS doesn't
// require declaration order for module-level interfaces.
export type StudentDetailDto = Omit<StudentDto, "activeGroupCount" | "enrollmentStatus"> & {
  groups: GroupDto[];
  auditLogs: AuditLogDto[];
};

export interface CreateStudentDirectInput {
  name: string;
  email?: string;
  phone: string;
  groupId?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

export interface CreateStudentResultDto {
  student: StudentDto;
  tempPassword: string;
}

export interface LinkParentInput {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
}

export interface LinkParentResultDto {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  tempPassword: string;
}

export interface ActiveStudentDto extends StudentDto {
  groupMemberships: GroupMembershipDto[];
}

export interface ParentDto {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseGroupSummary {
  id: string;
  name: string;
  status: GroupStatus;
  branchName: string | null;
}

export interface CourseDto {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  duration?: string | null;
  level?: string | null;
  category: CourseCategory;
  monthlyFee?: number | null;
  groupCount: number;
  studentCount: number;
  // Present only on GET /courses/:id (detail view), not the list.
  groups?: CourseGroupSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassroomDto {
  id: string;
  branchId: string;
  organizationId: string;
  name: string;
  capacity?: number | null;
}

export interface GroupDto {
  id: string;
  organizationId: string;
  branchId: string;
  courseId: string;
  name: string;
  status: GroupStatus;
  maxStudents?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  monthlyFee?: number | null;
  scheduleDays: string[];
  startTime?: string | null;
  endTime?: string | null;
  branch: BranchDto;
  course: CourseDto | null;
  teacherCount: number;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupTeacherAssignmentDto {
  id: string;
  organizationId: string;
  branchId: string;
  groupId: string;
  teacherId: string;
  assignmentRole: AssignmentRole;
  startDate: string;
  endDate?: string | null;
  status: AssignmentStatus;
  assignedBy: string;
  teacher: TeacherDto | null;
}

export interface GroupMembershipDto {
  id: string;
  organizationId: string;
  groupId: string;
  studentId: string;
  enrolledAt: string;
  status: MembershipStatus;
  student: StudentDto | null;
}

export interface ScheduleDto {
  id: string;
  groupId: string;
  branchId: string;
  organizationId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroomId?: string | null;
  group: GroupDto | null;
  classroom: ClassroomDto | null;
}

export interface CalendarSessionDto {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  group: { id: string; name: string } | null;
  course: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
  classroom: { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
  studentCount: number;
}

export interface CalendarDayDto {
  date: string;
  dayOfWeek: number;
  sessions: CalendarSessionDto[];
}

export interface CalendarWeekDto {
  weekStart: string;
  days: CalendarDayDto[];
}

export interface AttendanceDto {
  id: string;
  organizationId: string;
  branchId: string;
  groupId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
  student: StudentDto | null;
  group?: GroupDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface LessonDto {
  id: string;
  organizationId: string;
  branchId: string;
  groupId: string;
  teacherId: string;
  title: string;
  description?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// ---- AI Test Generator ----

export type QuestionType = "multiple_choice" | "fill_blank" | "true_false" | "short_answer" | "essay";
export type TestStatus = "draft" | "published" | "closed";
export type TestLanguage = "uz" | "en" | "ru";
export type TestSubmissionStatus = "submitted" | "graded";

export interface GeneratedQuestionDto {
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string | null;
  marks: number;
  explanation: string | null;
  order: number;
}

/** A pure preview from POST /ai-tests/generate — nothing is persisted until Save. */
export interface GeneratedTestDto {
  title: string;
  topic: string;
  subject: string;
  level: string;
  duration: number;
  language: TestLanguage;
  questions: GeneratedQuestionDto[];
  totalMarks: number;
  passMarks: number;
}

export interface QuestionDto {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string | null;
  marks: number;
  explanation: string | null;
  order: number;
}

export interface TestDto {
  id: string;
  title: string;
  topic: string;
  subject: string;
  level: string;
  duration: number;
  totalMarks: number;
  passMarks: number;
  status: TestStatus;
  teacherId: string;
  groupId?: string | null;
  group: { id: string; name: string } | null;
  organizationId: string;
  questionCount: number;
  submissionCount: number;
  averageScore: number | null;
  questions?: QuestionDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TestSummaryDto {
  countThisMonth: number;
  submissionsThisWeek: number;
  recentTests: TestDto[];
}

// ---- Student test-taking ----

export interface StudentTestListItemDto {
  id: string;
  title: string;
  topic: string;
  subject: string;
  level: string;
  duration: number;
  totalMarks: number;
  questionCount: number;
}

export interface StudentTakeQuestionDto {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  marks: number;
  order: number;
}

export interface StudentTakeTestDto {
  id: string;
  title: string;
  topic: string;
  subject: string;
  level: string;
  duration: number;
  totalMarks: number;
  passMarks: number;
  questions: StudentTakeQuestionDto[];
}

export interface SubmitTestResultDto {
  id: string;
  testId: string;
  studentId: string;
  totalScore: number;
  percentage: number;
  status: TestSubmissionStatus;
}

export interface TestResultQuestionDto {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  marks: number;
  correctAnswer: string | null;
  explanation: string | null;
  yourAnswer: string | null;
  isCorrect: boolean | null;
  marksObtained: number;
}

export interface TestOwnResultDto {
  test: { id: string; title: string; totalMarks: number; passMarks: number };
  totalScore: number;
  percentage: number;
  passed: boolean;
  status: TestSubmissionStatus;
  feedback?: string | null;
  questions: TestResultQuestionDto[];
}

/** Teacher-facing view of one student's submission — GET /ai-tests/:id/submissions/:submissionId */
export interface TestSubmissionDetailDto {
  submissionId: string;
  student: { id: string; name: string } | null;
  totalScore: number;
  totalMarks: number;
  percentage: number;
  status: TestSubmissionStatus;
  feedback?: string | null;
  questions: TestResultQuestionDto[];
}

// ---- Teacher: test results / analytics ----

export interface TestResultRowDto {
  submissionId: string;
  student: { id: string; name: string } | null;
  totalScore: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  status: TestSubmissionStatus;
  submittedAt: string | null;
  hasPendingEssay: boolean;
}

export interface TestQuestionAnalyticsDto {
  questionId: string;
  text: string;
  order: number;
  correctPercentage: number;
}

export interface TestResultsDto {
  summary: {
    totalStudents: number;
    submittedCount: number;
    notSubmittedCount: number;
    averageScore: number;
    passRate: number;
  };
  rows: TestResultRowDto[];
  questionAnalytics: TestQuestionAnalyticsDto[];
}

export interface HomeworkSubmissionCounts {
  total: number;
  pending?: number;
  submitted?: number;
  graded?: number;
  late?: number;
}

export interface HomeworkDto {
  id: string;
  organizationId: string;
  branchId: string;
  groupId: string;
  lessonId?: string | null;
  teacherId: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status: HomeworkStatus;
  createdAt: string;
  updatedAt: string;
  teacher?: TeacherDto | null;
  lesson?: LessonDto | null;
  submissionCounts?: HomeworkSubmissionCounts;
}

export interface HomeworkSubmissionDto {
  id: string;
  organizationId: string;
  homeworkId: string;
  studentId: string;
  status: SubmissionStatus;
  submittedAt?: string | null;
  score?: number | null;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: StudentDto | null;
}

export interface HomeworkDetailDto extends HomeworkDto {
  submissions: HomeworkSubmissionDto[];
}

export interface StudentHomeworkDto {
  submissionId: string;
  homeworkId: string;
  title: string;
  description?: string | null;
  group: { id: string; name: string } | null;
  dueDate: string | null;
  homeworkStatus: HomeworkStatus;
  submissionStatus: SubmissionStatus;
  score?: number | null;
  feedback?: string | null;
}

export interface TeacherGroupDto {
  id: string;
  organizationId: string;
  branchId: string;
  courseId: string;
  name: string;
  status: GroupStatus;
  maxStudents?: number | null;
  branch: BranchDto;
  course: CourseDto | null;
  studentCount: number;
  schedules: ScheduleDto[];
}

export interface TeacherGroupStudentDto extends StudentDto {
  totalAttendanceRecords: number;
  attendanceRate: number | null;
}

export interface FinancialAccountDto {
  id: string;
  organizationId: string;
  branchId?: string | null;
  name: string;
  type: AccountType;
  isActive: boolean;
  balance: number;
}

export interface ChargeGroupSummary {
  id: string;
  name: string;
  courseName: string | null;
}

export interface ChargeDto {
  id: string;
  organizationId: string;
  branchId: string;
  studentId: string;
  amount: number;
  currency: string;
  description?: string | null;
  dueDate: string;
  status: ChargeStatus;
  student: StudentDto | null;
  createdAt: string;
  // Computed on read — never stored (see finance.service.ts). Present on
  // responses from GET /finance/charges and /finance/charges/overdue.
  group?: ChargeGroupSummary | null;
  isOverdue?: boolean;
  daysOverdue?: number | null;
  daysUntilDue?: number | null;
}

export type ChargesSortBy = "urgency" | "dueDate" | "amount" | "name";

export interface PaymentSummaryDto {
  totalPending: number;
  totalOverdue: number;
  totalPaid: number;
  totalAmountOwed: number;
  totalAmountCollected: number;
  overdueStudentCount: number;
}

// Text labels only — no real payment gateway/API integration behind any of these.
export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "card",
  "click",
  "payme",
  "humo_terminal",
  "uzum_bank",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentDto {
  id: string;
  organizationId: string;
  branchId: string;
  studentId: string;
  financialAccountId: string;
  chargeId?: string | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference?: string | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  student: StudentDto | null;
  createdAt: string;
}

export interface ExpectedVsActualMonthDto {
  month: string;
  expected: number;
  actual: number;
}

export interface DashboardStatsDto {
  monthlyPlan: number;
  collectedThisMonth: number;
  debtorsCount: number;
  totalDebt: number;
  expectedVsActual: ExpectedVsActualMonthDto[];
}

export interface TodayReportDto {
  revenueToday: number;
  checkedInToday: number;
  lessonsHeldToday: number;
  newLeadsToday: number;
  newTrialsToday: number;
  newContractsToday: number;
  newPaymentsToday: number;
  dismissedToday: number;
}

// Dashboard-only funnel aggregate now — the CRM Pipeline board that also
// read this has been removed, but stage is still advanced automatically
// (enrollment conversion, first payment), so this stays meaningful.
export interface StageCountsDto {
  leads: number;
  trials: number;
  contracts: number;
  paid: number;
  refusals: number;
}

export type ReminderType = "sms" | "whatsapp" | "email" | "push";
export type ReminderStatus = "pending" | "sent" | "delivered" | "failed";

export interface ReminderDto {
  id: string;
  organizationId: string;
  chargeId: string;
  studentId: string;
  parentId?: string | null;
  type: ReminderType;
  status: ReminderStatus;
  content: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  failedReason?: string | null;
  createdById: string;
  createdAt: string;
  student?: StudentDto | null;
  charge?: ChargeDto | null;
}

export interface OverdueChargeDto extends ChargeDto {
  daysOverdue: number;
  lastReminder: ReminderDto | null;
}

export interface ReminderStatsDto {
  sent: number;
  delivered: number;
  failed: number;
  conversionRate: number;
  avgDaysToPay: number | null;
}

export interface FinancialTransactionDto {
  id: string;
  organizationId: string;
  branchId?: string | null;
  financialAccountId?: string | null;
  studentId?: string | null;
  type: string;
  direction: TransactionDirection;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

// ---- Analytics ----

export interface RevenueAnalyticsDto {
  totalRevenue: number;
  totalCharges: number;
  collectionRate: number;
  outstandingBalance: number;
  dailyRevenue: { date: string; amount: number }[];
  monthlyRevenue: { month: string; amount: number }[];
  revenueByBranch: { branchId: string; branchName: string; amount: number }[];
  revenueByPaymentMethod: { method: string; amount: number }[];
}

export interface EnrollmentAnalyticsDto {
  totalStudents: number;
  totalNewcomers: number;
  totalDropped: number;
  totalCompleted: number;
  conversionRate: number;
  enrollmentTrend: { month: string; newStudents: number; droppedStudents: number; netChange: number }[];
  studentsByBranch: { branchId: string; branchName: string; count: number }[];
  studentsByCourse: { courseId: string; courseName: string; count: number }[];
  newcomerConversionTrend: { month: string; newcomers: number; converted: number }[];
}

export interface TeacherWorkloadEntry {
  teacherId: string;
  teacherName: string;
  groupCount: number;
  studentCount: number;
  attendanceSessions: number;
  lessonNotesCount: number;
}

export interface TeacherAnalyticsDto {
  totalTeachers: number;
  activeTeachers: number;
  teacherWorkload: TeacherWorkloadEntry[];
  topTeachersByAttendance: { teacherId: string; teacherName: string; sessionsCount: number }[];
  averageStudentsPerTeacher: number;
}

export interface AttendanceAnalyticsDto {
  overallRate: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  dailyRate: { date: string; rate: number }[];
  rateByGroup: { groupId: string; groupName: string; rate: number }[];
  rateByBranch: { branchId: string; branchName: string; rate: number }[];
  lowAttendanceStudents: { studentId: string; studentName: string; rate: number; groupName: string }[];
}

export interface FinanceHealthDto {
  totalCashOnHand: number;
  monthlyBurnRate: number;
  runwayMonths: number | null;
  overdueChargesCount: number;
  overdueChargesAmount: number;
  thisMonthRevenue: number;
  thisMonthCharges: number;
  thisMonthCollectionRate: number;
}

export interface StaffMemberDto {
  userId: string;
  name: string;
  email: string;
  roleSlug: string;
  roleName: string;
  branchName: string | null;
  status: TeamMemberStatus;
  teacherId: string | null;
  dashboardAccessStatus: DashboardStatus | null;
  mustChangePassword: boolean;
}

export interface CreateReceptionistInput {
  name: string;
  email: string;
  phone: string;
}

export interface CreateReceptionistResultDto {
  user: { id: string; name: string; email: string };
  tempPassword: string;
}

export interface TempPasswordDto {
  tempPassword: string | null;
}

export interface TeacherStudentRowDto {
  student: StudentDto;
  groupId: string;
  groupName: string;
  enrolledAt: string;
}

export interface QuickStatsDto {
  newcomersThisWeek: number;
  conversionsThisWeek: number;
  homeworkCompletionRate: number;
  todayAttendanceRate: number;
}

export interface NewcomerConversionFunnelDto {
  totalNewcomersThisMonth: number;
  convertedToActive: number;
  conversionRate: number;
  avgDaysToConvert: number | null;
  topConversionSources: { source: string; count: number }[];
}

// ---- Student portal ----

export interface StudentSessionDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  mustChangePassword: boolean;
}

export interface StudentGroupScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroomName: string | null;
}

export interface StudentGroupDto {
  id: string;
  name: string;
  courseName: string;
  teacherName: string;
  teacherPhone: string | null;
  teacherEmail: string | null;
  branchName: string;
  branchAddress: string | null;
  schedule: StudentGroupScheduleEntry[];
}

export interface StudentScheduleSessionDto {
  groupId: string;
  groupName: string;
  courseName: string;
  teacherName: string;
  teacherPhone: string | null;
  teacherEmail: string | null;
  branchName: string;
  branchAddress: string | null;
  classroomName: string | null;
  startTime: string;
  endTime: string;
}

export interface StudentScheduleDayDto {
  date: string;
  dayOfWeek: number;
  sessions: StudentScheduleSessionDto[];
}

export interface StudentAttendanceRecordDto {
  id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
  groupName: string;
}

export interface StudentPaymentsDto {
  totalOwed: number;
  totalPaid: number;
  balance: number;
  charges: {
    id: string;
    amount: number;
    currency: string;
    description?: string | null;
    dueDate: string;
    status: ChargeStatus;
  }[];
  payments: { id: string; amount: number; currency: string; date: string; method: string }[];
}

export interface StudentDashboardDto {
  student: { name: string; email: string | null; phone: string | null; emergencyContact: string | null };
  groups: StudentGroupDto[];
  attendanceSummary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number | null;
  };
  recentAttendance: { date: string; status: AttendanceStatus; groupName: string }[];
  homework: StudentHomeworkDto[];
  payments: StudentPaymentsDto;
}

// ---- Parent portal ----
// A parent isn't its own account row — they authenticate with the
// parentEmail/parentPhone/parentPassword fields on the Student (child) they
// are attached to. See auth.controller.ts POST /auth/parent-login.

export interface ParentSessionDto {
  studentId: string;
  studentName: string;
  parentName: string | null;
  organizationName: string;
  mustChangePassword: boolean;
}

export interface ParentTeacherContactDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
}

export interface ParentGroupScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroomName: string | null;
}

export interface ParentGroupDto {
  id: string;
  name: string;
  courseName: string;
  courseCategory: CourseCategory;
  branchName: string;
  branchPhone: string | null;
  teacher: ParentTeacherContactDto | null;
  schedule: ParentGroupScheduleEntry[];
}

export interface ParentScheduleSessionDto {
  groupId: string;
  groupName: string;
  courseName: string;
  teacherName: string;
  classroomName: string | null;
  branchName: string;
  startTime: string;
  endTime: string;
}

export interface ParentScheduleDayDto {
  date: string;
  dayOfWeek: number;
  sessions: ParentScheduleSessionDto[];
}

export interface ParentAttendanceRecordDto {
  id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
  groupName: string;
  teacherName: string;
}

export interface ParentHomeworkDto extends StudentHomeworkDto {
  teacherName: string;
}

// THIS IS THE KEY FEATURE — one row per (teacher, group) so a parent sees
// every teacher across their child's groups with direct contact details.
export interface ParentTeacherDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  groupName: string;
  courseName: string;
  // Fallback contact for the "No phone/email? Contact via reception" case.
  branchPhone: string | null;
}

export interface ParentPaymentChargeDto {
  id: string;
  amount: number;
  currency: string;
  description?: string | null;
  dueDate: string;
  status: ChargeStatus;
  daysOverdue: number | null;
  daysUntilDue: number | null;
}

export interface ParentPaymentsDto {
  totalOwed: number;
  totalPaid: number;
  balance: number;
  charges: ParentPaymentChargeDto[];
  payments: { id: string; amount: number; currency: string; date: string; method: string }[];
}

export interface ParentDashboardDto {
  student: {
    name: string;
    email: string | null;
    phone: string | null;
    parentName: string | null;
    parentEmail: string | null;
    parentPhone: string | null;
  };
  groups: ParentGroupDto[];
  attendanceSummary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number | null;
  };
  recentAttendance: { date: string; status: AttendanceStatus; groupName: string }[];
  homework: ParentHomeworkDto[];
  payments: ParentPaymentsDto;
}

// ---- Platform admin ----

export interface OrganizationSummaryDto {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  createdAt: string;
  subscription: { planName: string; status: string; currentPeriodEnd: string; amount: number } | null;
  stats: { branchCount: number; teacherCount: number; studentCount: number; totalRevenue: number };
}

export interface OrganizationDetailDto {
  organization: OrganizationDto;
  branches: BranchDto[];
  users: { userId: string; name: string; email: string; role: string; status: TeamMemberStatus }[];
  subscriptionHistory: {
    id: string;
    planName: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    createdAt: string;
  }[];
  stats: { branchCount: number; teacherCount: number; studentCount: number; totalRevenue: number };
  auditLog: AuditLogDto[];
}

export interface PlatformRevenueDto {
  totalMrr: number;
  totalArr: number;
  totalRevenue: number;
  monthlyRevenue: { month: string; amount: number }[];
  revenueByPlan: { planName: string; amount: number }[];
  churnRate: number;
  activeOrganizations: number;
  trialOrganizations: number;
  suspendedOrganizations: number;
}

export interface PlatformHealthDto {
  totalOrganizations: number;
  totalActiveStudents: number;
  totalActiveTeachers: number;
  totalBranches: number;
  totalGroups: number;
  avgStudentsPerOrg: number;
  avgRevenuePerOrg: number;
  topOrganizationsByRevenue: { name: string; revenue: number }[];
}

// ---- Self-service signup ----

export interface SignupRequestDto {
  organizationName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  password: string;
  country: string;
  city: string;
  address?: string;
}

export interface SignupResponseDto {
  success: true;
  message: string;
  organizationId: string;
}

export interface LoginResponseDto {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  isPlatformAdmin: boolean;
  role: PortalRole;
  organizationSlug: string | null;
  teacherId: string | null;
}

export interface SubscriptionPlanDto {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
}

export interface ApplicationDto {
  id: string;
  name: string;
  slug: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  createdAt: string;
}

export interface BriefingActionDto {
  label: string;
  href: string;
  urgent: boolean;
}

interface BriefingBaseDto {
  greeting: string;
  date: string;
  quote: string;
  actions: BriefingActionDto[];
}

export interface OwnerBriefingDto extends BriefingBaseDto {
  stats: {
    todayClasses: number;
    todayStudents: number;
    pendingPayments: number;
    pendingApprovals: number;
    lowAttendanceAlert: number;
  };
}

export interface TeacherBriefingDto extends BriefingBaseDto {
  stats: {
    todayClasses: number;
    totalStudents: number;
    attendancePending: number;
    homeworkDue: number;
    testsToGrade: number;
  };
  nextClass: { groupName: string; time: string; classroom: string; studentsCount: number } | null;
}

export interface ReceptionBriefingDto extends BriefingBaseDto {
  stats: {
    todayNewcomers: number;
    pendingConversions: number;
    overduePayments: number;
    todayClasses: number;
  };
}

export interface StudentBriefingDto extends BriefingBaseDto {
  stats: {
    todayClasses: number;
    pendingHomework: number;
    attendanceRate: number;
    balanceDue: number;
  };
  nextClass: { groupName: string; time: string; classroom: string } | null;
}

export interface ParentBriefingDto extends BriefingBaseDto {
  stats: {
    childName: string;
    todayClasses: number;
    attendanceRate: number;
    pendingHomework: number;
    balanceDue: number;
  };
  nextClass: { groupName: string; time: string; classroom: string } | null;
  teacherContacts: { name: string; email: string | null; phone: string | null }[];
}

export interface PlatformAdminBriefingDto extends BriefingBaseDto {
  stats: {
    totalOrgs: number;
    pendingApprovals: number;
    totalRevenue: number;
    activeStudents: number;
  };
}

export type SalaryType = "fixed" | "hourly" | "per_student";
export type SalaryStatus = "active" | "paused" | "terminated";
export type SalaryPaymentStatus = "pending" | "paid" | "delayed";
export type SalaryPaymentMethod = "cash" | "bank_transfer" | "card";

export interface TeacherSalaryLineDto {
  id: string;
  teacherId: string;
  teacherName: string;
  amount: number;
  currency: string;
  type: SalaryType;
  hourlyRate: number | null;
  perStudentRate: number | null;
  status: SalaryStatus;
  effectiveFrom: string;
  notes: string | null;
  thisMonthPaymentStatus: SalaryPaymentStatus;
  thisMonthPaymentId: string | null;
  lastPaidAt: string | null;
}

export interface SalaryAnalyticsDto {
  totalMonthlySalaries: number;
  totalHourlyEstimated: number;
  totalPerStudentEstimated: number;
  totalSalaryExpense: number;
  teacherSalaries: {
    teacherId: string;
    teacherName: string;
    amount: number;
    type: SalaryType;
    status: SalaryStatus;
    thisMonthPaymentStatus: SalaryPaymentStatus;
    lastPaidAt: string | null;
  }[];
  monthlyHistory: { month: string; totalPaid: number; totalPending: number }[];
}

export interface SalaryPaymentDto {
  id: string;
  teacherSalaryId: string;
  amount: number;
  currency: string;
  month: string;
  status: SalaryPaymentStatus;
  paidAt: string | null;
  paymentMethod: SalaryPaymentMethod | null;
  notes: string | null;
  createdAt: string;
}

export interface TeacherOwnSalaryDto {
  amount: number;
  type: SalaryType;
  currency: string;
  hourlyRate: number | null;
  perStudentRate: number | null;
  effectiveFrom: string;
  status: SalaryStatus;
  thisMonthPaymentStatus: SalaryPaymentStatus;
  lastPaidAt: string | null;
  paymentHistory: SalaryPaymentDto[];
}

export interface SetSalaryInput {
  teacherId: string;
  type: SalaryType;
  amount: number;
  currency?: string;
  hourlyRate?: number;
  perStudentRate?: number;
  effectiveFrom?: string;
  notes?: string;
}

export interface RecordSalaryPaymentInput {
  month: string;
  amount: number;
  paymentMethod?: SalaryPaymentMethod;
  paidAt?: string;
  notes?: string;
}

export type PlanModule = "payment_reminders" | "homework" | "analytics" | "ai_tests" | "parent_portal" | "multi_branch_reports";

export interface CurrentSubscriptionDto {
  subscription: { id: string; status: string; currentPeriodStart: string; currentPeriodEnd: string } | null;
  plan: { slug: string; name: string };
  limits: { maxBranches: number | null; maxStudents: number | null; maxTeachers: number | null };
  allowedModules: PlanModule[];
  usage: { branchCount: number; studentCount: number; teacherCount: number };
}

export interface LimitBreakdownEntryDto {
  resource: "branch" | "student" | "teacher";
  current: number;
  limit: number | null;
  percentage: number;
}

export interface SubscriptionLimitsDto {
  planSlug: string;
  planName: string;
  branches: LimitBreakdownEntryDto;
  students: LimitBreakdownEntryDto;
  teachers: LimitBreakdownEntryDto;
}

export interface SubscriptionPlanListItemDto {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  features: unknown;
}

export type TicketType = "issue" | "idea" | "question" | "other";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface SupportTicketDto {
  id: string;
  type: TicketType;
  title: string;
  description: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  internalNotes?: string | null;
  submitterType: string;
  submitterId: string;
  submitterName: string;
  organizationId: string | null;
  organizationName?: string | null;
  visibleToOrg: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  type: TicketType;
  title: string;
  description: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  priority?: TicketPriority;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  internalNotes?: string;
}

export interface TicketSummaryDto {
  totalOpen: number;
  totalToday: number;
  totalThisWeek: number;
}
