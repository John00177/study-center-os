import { Controller, ForbiddenException, Get, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { TenancyService } from "../tenancy/tenancy.service";
import { TeacherDashboardGuard } from "../teacher-dashboard/teacher-dashboard.guard";
import { StudentPortalGuard } from "../student-portal/student-portal.guard";
import { ParentPortalGuard } from "../parent-portal/parent-portal.guard";
import { PlatformAdminGuard } from "../platform-admin/platform-admin.guard";
import { DailyBriefingService } from "./daily-briefing.service";

@Controller()
export class DailyBriefingController {
  constructor(
    private readonly dailyBriefingService: DailyBriefingService,
    private readonly tenancyService: TenancyService,
  ) {}

  @UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
  @RequirePermission("owner", "admin", "reception")
  @Get("daily-briefing")
  getDailyBriefing(@Req() req: Request) {
    const organizationId = this.tenancyService.getOrganizationId();
    const userName = req.user?.name ?? "";
    const roleSlug = req.membership?.role.slug;
    if (roleSlug === "reception") {
      return this.dailyBriefingService.getReceptionBriefing(organizationId, userName);
    }
    return this.dailyBriefingService.getOwnerBriefing(organizationId, userName);
  }

  @UseGuards(AuthenticatedGuard, TenancyGuard, TeacherDashboardGuard)
  @Get("teacher/daily-briefing")
  getTeacherDailyBriefing(@Req() req: Request) {
    if (!req.teacherId) {
      throw new ForbiddenException("Teacher dashboard not activated");
    }
    return this.dailyBriefingService.getTeacherBriefing(
      this.tenancyService.getOrganizationId(),
      req.teacherId,
      req.user?.name ?? "",
    );
  }

  @UseGuards(StudentPortalGuard)
  @Get("student/daily-briefing")
  getStudentDailyBriefing(@Req() req: Request) {
    return this.dailyBriefingService.getStudentBriefing(req.session.studentOrganizationId!, req.session.studentId!);
  }

  @UseGuards(ParentPortalGuard)
  @Get("parent/daily-briefing")
  getParentDailyBriefing(@Req() req: Request) {
    return this.dailyBriefingService.getParentBriefing(req.session.parentOrganizationId!, req.session.parentStudentId!);
  }

  @UseGuards(AuthenticatedGuard, PlatformAdminGuard)
  @Get("admin/daily-briefing")
  getPlatformAdminDailyBriefing(@Req() req: Request) {
    return this.dailyBriefingService.getPlatformAdminBriefing(req.user?.name ?? "");
  }
}
