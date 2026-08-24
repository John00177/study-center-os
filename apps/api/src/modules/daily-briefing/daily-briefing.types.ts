export interface BriefingAction {
  label: string;
  href: string;
  urgent: boolean;
}

interface BriefingBase {
  greeting: string;
  date: string;
  quote: string;
  actions: BriefingAction[];
}

export interface OwnerBriefing extends BriefingBase {
  stats: {
    todayClasses: number;
    todayStudents: number;
    pendingPayments: number;
    pendingApprovals: number;
    lowAttendanceAlert: number;
  };
}

export interface TeacherBriefing extends BriefingBase {
  stats: {
    todayClasses: number;
    totalStudents: number;
    attendancePending: number;
    homeworkDue: number;
    testsToGrade: number;
  };
  nextClass: { groupName: string; time: string; classroom: string; studentsCount: number } | null;
}

export interface ReceptionBriefing extends BriefingBase {
  stats: {
    todayNewcomers: number;
    pendingConversions: number;
    overduePayments: number;
    todayClasses: number;
  };
}

export interface StudentBriefing extends BriefingBase {
  stats: {
    todayClasses: number;
    pendingHomework: number;
    attendanceRate: number;
    balanceDue: number;
  };
  nextClass: { groupName: string; time: string; classroom: string } | null;
}

export interface ParentBriefing extends BriefingBase {
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

export interface PlatformAdminBriefing extends BriefingBase {
  stats: {
    totalOrgs: number;
    pendingApprovals: number;
    totalRevenue: number;
    activeStudents: number;
  };
}
