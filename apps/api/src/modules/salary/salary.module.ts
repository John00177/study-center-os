import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TeacherDashboardGuard } from "../teacher-dashboard/teacher-dashboard.guard";
import { SalaryService } from "./salary.service";
import { SalaryController } from "./salary.controller";
import { TeacherSalaryController } from "./teacher-salary.controller";

@Module({
  imports: [TenancyModule, AuditModule, NotificationsModule],
  controllers: [SalaryController, TeacherSalaryController],
  providers: [SalaryService, TeacherDashboardGuard],
  exports: [SalaryService],
})
export class SalaryModule {}
