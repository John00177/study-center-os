import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { SubscriptionService } from "./subscription.service";
import { ChangePlanDto } from "./dto/change-plan.dto";

@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard)
@Controller("subscription")
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get("current")
  getCurrent() {
    return this.subscriptionService.getCurrentPlanSummary(this.tenancyService.getOrganizationId());
  }

  @Get("limits")
  getLimits() {
    return this.subscriptionService.getLimitBreakdown(this.tenancyService.getOrganizationId());
  }

  @Get("plans")
  listPlans() {
    return this.subscriptionService.listPlans();
  }

  @RequirePermission("owner")
  @Post("upgrade")
  upgrade(@Body() dto: ChangePlanDto, @Req() req: Request) {
    return this.subscriptionService.changePlan(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto.planId,
    );
  }

  @RequirePermission("owner")
  @Post("cancel")
  cancel(@Req() req: Request) {
    return this.subscriptionService.cancelSubscription(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
    );
  }
}
