import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { TenancyGuard } from "../tenancy/tenancy.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { PermissionSlugGuard } from "../auth/guards/permission-slug.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequirePermissionSlug } from "../../common/decorators/require-permission-slug.decorator";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { SkipSubscriptionGuard } from "../../common/decorators/skip-subscription-guard.decorator";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsQueryDto, AttendanceAnalyticsQueryDto } from "./dto/analytics-query.dto";

// Analytics is owner/admin only (see Adjustment 2: "/analytics: 403 for
// non-owner/admin") — this superseded an earlier broader grant to
// manager/reception. Revenue/finance-health additionally require
// finance.view, same gate as the Finance module (which only owner/admin
// hold anyway, so it's redundant here but kept for consistency).
const STAFF_ROLES = ["owner", "admin"];

// Analytics is a Growth+ feature — Starter orgs get 403 with an upgrade
// message on every route here.
@UseGuards(AuthenticatedGuard, TenancyGuard, PermissionGuard, PermissionSlugGuard, SubscriptionGuard(["growth", "pro"]))
@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly tenancyService: TenancyService,
  ) {}

  // Reception also holds finance.view (for the Finance/Overdue Payments
  // pages), so the slug check alone isn't enough to keep them out of
  // Analytics — stack the owner/admin role check explicitly.
  @RequirePermission(...STAFF_ROLES)
  @RequirePermissionSlug("finance.view")
  @Get("revenue")
  getRevenueAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getRevenueAnalytics(this.tenancyService.getOrganizationId(), query);
  }

  // Exempt from the Growth+ gate: totalStudents from this backs the core
  // owner Dashboard's "Active Students" stat card, not just the premium
  // Analytics page's Enrollment tab.
  @SkipSubscriptionGuard()
  @RequirePermission(...STAFF_ROLES)
  @Get("enrollment")
  getEnrollmentAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getEnrollmentAnalytics(this.tenancyService.getOrganizationId(), query);
  }

  @RequirePermission(...STAFF_ROLES)
  @Get("teachers")
  getTeacherAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTeacherAnalytics(this.tenancyService.getOrganizationId(), query);
  }

  @RequirePermission(...STAFF_ROLES)
  @Get("attendance")
  getAttendanceAnalytics(@Query() query: AttendanceAnalyticsQueryDto) {
    return this.analyticsService.getAttendanceAnalytics(this.tenancyService.getOrganizationId(), query);
  }

  // Exempt from the Growth+ gate: this backs the core owner Dashboard's
  // "Finance Overview" widget, not the premium Analytics page.
  @SkipSubscriptionGuard()
  @RequirePermission(...STAFF_ROLES)
  @RequirePermissionSlug("finance.view")
  @Get("finance-health")
  getFinanceHealth() {
    return this.analyticsService.getFinanceHealth(this.tenancyService.getOrganizationId());
  }

  @RequirePermission(...STAFF_ROLES)
  @Get("newcomer-funnel")
  getNewcomerConversionFunnel() {
    return this.analyticsService.getNewcomerConversionFunnel(this.tenancyService.getOrganizationId());
  }

  // Exempt from the Growth+ gate: this backs the core owner Dashboard's
  // "Quick Stats" widget, not the premium Analytics page.
  @SkipSubscriptionGuard()
  @RequirePermission(...STAFF_ROLES)
  @Get("quick-stats")
  getQuickStats() {
    return this.analyticsService.getQuickStats(this.tenancyService.getOrganizationId());
  }
}
