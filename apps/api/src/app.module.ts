import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenancyModule } from "./modules/tenancy/tenancy.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { AuditModule } from "./modules/audit/audit.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { TeachersModule } from "./modules/teachers/teachers.module";
import { StudentsModule } from "./modules/students/students.module";
import { ParentsModule } from "./modules/parents/parents.module";
import { CoursesModule } from "./modules/courses/courses.module";
import { GroupsModule } from "./modules/groups/groups.module";
import { ClassroomsModule } from "./modules/classrooms/classrooms.module";
import { SchedulesModule } from "./modules/schedules/schedules.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { TeacherDashboardModule } from "./modules/teacher-dashboard/teacher-dashboard.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { RemindersModule } from "./modules/reminders/reminders.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { HomeworkModule } from "./modules/homework/homework.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { StaffModule } from "./modules/staff/staff.module";
import { StudentPortalModule } from "./modules/student-portal/student-portal.module";
import { ParentPortalModule } from "./modules/parent-portal/parent-portal.module";
import { AiTestGeneratorModule } from "./modules/ai-test-generator/ai-test-generator.module";
import { PlatformAdminModule } from "./modules/platform-admin/platform-admin.module";
import { SubscriptionModule } from "./modules/subscription/subscription.module";
import { DailyBriefingModule } from "./modules/daily-briefing/daily-briefing.module";
import { SalaryModule } from "./modules/salary/salary.module";
import { MustChangePasswordGuard } from "./common/guards/must-change-password.guard";
import { SupportTicketsModule } from "./modules/support-tickets/support-tickets.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    // Drives the daily overdue-payment sweep in NotificationsService.
    ScheduleModule.forRoot(),
    PrismaModule,
    IdentityModule,
    AuthModule,
    TenancyModule,
    AuditModule,
    BranchesModule,
    OrganizationsModule,
    TeachersModule,
    StudentsModule,
    ParentsModule,
    CoursesModule,
    GroupsModule,
    ClassroomsModule,
    SchedulesModule,
    AttendanceModule,
    TeacherDashboardModule,
    FinanceModule,
    RemindersModule,
    NotificationsModule,
    HomeworkModule,
    AnalyticsModule,
    StaffModule,
    StudentPortalModule,
    ParentPortalModule,
    AiTestGeneratorModule,
    PlatformAdminModule,
    SubscriptionModule,
    DailyBriefingModule,
    SalaryModule,
    SupportTicketsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MustChangePasswordGuard,
    },
  ],
})
export class AppModule {}
