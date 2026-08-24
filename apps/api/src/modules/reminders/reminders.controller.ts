import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { PermissionSlugGuard } from "../auth/guards/permission-slug.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermissionSlug } from "../../common/decorators/require-permission-slug.decorator";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { RemindersService } from "./reminders.service";
import { OverdueChargesQueryDto } from "./dto/overdue-charges-query.dto";
import { SendReminderDto } from "./dto/send-reminder.dto";

// Payment reminders (SMS/WhatsApp overdue nudges) are a Growth+ feature —
// Starter orgs get 403 with an upgrade message on every route here.
@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard, PermissionSlugGuard, SubscriptionGuard(["growth", "pro"]))
@RequirePermissionSlug("finance.view")
@Controller("reminders")
export class RemindersController {
  constructor(
    private readonly remindersService: RemindersService,
    private readonly tenancyService: TenancyService,
  ) {}

  @Get("overdue")
  getOverdueCharges(@Query() query: OverdueChargesQueryDto) {
    return this.remindersService.getOverdueCharges(this.tenancyService.getOrganizationId(), query);
  }

  @Post("send")
  sendReminder(@Body() dto: SendReminderDto, @Req() req: Request) {
    return this.remindersService.sendReminder(
      this.tenancyService.getOrganizationId(),
      (req.user as Express.User).id,
      dto,
    );
  }

  @Get("history")
  getReminderHistory(@Query("studentId") studentId?: string) {
    return this.remindersService.getReminderHistory(this.tenancyService.getOrganizationId(), studentId);
  }

  @Get("stats")
  getReminderStats() {
    return this.remindersService.getReminderStats(this.tenancyService.getOrganizationId());
  }
}
