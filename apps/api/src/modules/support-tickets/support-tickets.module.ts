import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { StudentPortalGuard } from "../student-portal/student-portal.guard";
import { ParentPortalGuard } from "../parent-portal/parent-portal.guard";
import { PlatformAdminGuard } from "../platform-admin/platform-admin.guard";
import { SupportTicketsService } from "./support-tickets.service";
import { SupportTicketsController } from "./support-tickets.controller";

@Module({
  imports: [TenancyModule, AuditModule, NotificationsModule],
  controllers: [SupportTicketsController],
  // StudentPortalGuard/ParentPortalGuard/PlatformAdminGuard aren't exported
  // by their home modules — registered directly here, matching the pattern
  // used by daily-briefing.module.ts.
  providers: [SupportTicketsService, StudentPortalGuard, ParentPortalGuard, PlatformAdminGuard],
})
export class SupportTicketsModule {}
