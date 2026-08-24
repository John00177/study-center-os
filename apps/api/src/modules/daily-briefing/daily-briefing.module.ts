import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { IdentityModule } from "../identity/identity.module";
import { TeacherDashboardGuard } from "../teacher-dashboard/teacher-dashboard.guard";
import { StudentPortalGuard } from "../student-portal/student-portal.guard";
import { ParentPortalGuard } from "../parent-portal/parent-portal.guard";
import { PlatformAdminGuard } from "../platform-admin/platform-admin.guard";
import { DailyBriefingService } from "./daily-briefing.service";
import { DailyBriefingController } from "./daily-briefing.controller";

// Rather than importing each portal's full module (which would pull in its
// controller/service and risk duplicate route registration), this registers
// the four portal guard classes directly as local providers — PrismaService
// (needed by TeacherDashboardGuard/ParentPortalGuard) is globally available
// via PrismaModule, so this is sufficient for Nest to construct them.
@Module({
  imports: [TenancyModule, IdentityModule],
  controllers: [DailyBriefingController],
  providers: [DailyBriefingService, TeacherDashboardGuard, StudentPortalGuard, ParentPortalGuard, PlatformAdminGuard],
})
export class DailyBriefingModule {}
