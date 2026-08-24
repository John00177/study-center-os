import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { PlatformAdminGuard } from "./platform-admin.guard";
import { PlatformAdminService } from "./platform-admin.service";
import { OrganizationsQueryDto } from "./dto/organizations-query.dto";
import { PlatformRevenueQueryDto } from "./dto/platform-revenue-query.dto";
import { SuspendOrganizationDto } from "./dto/suspend-organization.dto";
import { ApproveApplicationDto } from "./dto/approve-application.dto";
import { RejectApplicationDto } from "./dto/reject-application.dto";

@UseGuards(AuthenticatedGuard, PlatformAdminGuard)
@Controller("platform")
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Get("organizations")
  getAllOrganizations(@Query() query: OrganizationsQueryDto) {
    return this.platformAdminService.getAllOrganizations(query);
  }

  @Get("organizations/:id")
  getOrganizationDetail(@Param("id") id: string) {
    return this.platformAdminService.getOrganizationDetail(id);
  }

  @Get("revenue")
  getPlatformRevenue(@Query() query: PlatformRevenueQueryDto) {
    return this.platformAdminService.getPlatformRevenue(query);
  }

  @Get("health")
  getPlatformHealth() {
    return this.platformAdminService.getPlatformHealth();
  }

  @Post("organizations/:id/suspend")
  suspendOrganization(@Param("id") id: string, @Body() dto: SuspendOrganizationDto, @Req() req: Request) {
    return this.platformAdminService.suspendOrganization(id, (req.user as Express.User).id, dto.reason);
  }

  @Post("organizations/:id/activate")
  activateOrganization(@Param("id") id: string, @Req() req: Request) {
    return this.platformAdminService.activateOrganization(id, (req.user as Express.User).id);
  }

  @Get("plans")
  getSubscriptionPlans() {
    return this.platformAdminService.getSubscriptionPlans();
  }

  @Get("applications")
  getPendingApplications() {
    return this.platformAdminService.getPendingApplications();
  }

  @Post("applications/:id/approve")
  approveApplication(@Param("id") id: string, @Body() dto: ApproveApplicationDto, @Req() req: Request) {
    return this.platformAdminService.approveApplication(id, (req.user as Express.User).id, dto);
  }

  @Post("applications/:id/reject")
  rejectApplication(@Param("id") id: string, @Body() dto: RejectApplicationDto, @Req() req: Request) {
    return this.platformAdminService.rejectApplication(id, (req.user as Express.User).id, dto);
  }
}
