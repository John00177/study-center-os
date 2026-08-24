import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AttendanceModule } from "../attendance/attendance.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TeacherDashboardService } from "./teacher-dashboard.service";
import { TeacherDashboardController } from "./teacher-dashboard.controller";
import { TeacherDashboardGuard } from "./teacher-dashboard.guard";

@Module({
  imports: [TenancyModule, AttendanceModule, NotificationsModule],
  controllers: [TeacherDashboardController],
  providers: [TeacherDashboardService, TeacherDashboardGuard],
  exports: [TeacherDashboardService],
})
export class TeacherDashboardModule {}
