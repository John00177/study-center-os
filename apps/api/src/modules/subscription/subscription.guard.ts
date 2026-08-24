import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Type, mixin } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { SKIP_SUBSCRIPTION_GUARD_KEY } from "../../common/decorators/skip-subscription-guard.decorator";
import { SubscriptionLimitsService } from "./subscription-limits.service";

const PLAN_NAMES: Record<string, string> = { starter: "Starter", growth: "Growth", pro: "Pro" };

/**
 * Gates an entire controller/route behind a plan tier — e.g.
 * `@UseGuards(AuthenticatedGuard, TenancyGuard, SubscriptionGuard(["growth", "pro"]))`.
 * Reads organizationId straight off the request (set by TenancyGuard for
 * staff, or the portal session for student/parent routes) rather than
 * depending on guard ordering via DI, so it works in either position.
 */
export function SubscriptionGuard(allowedPlans: string[]): Type<CanActivate> {
  @Injectable()
  class SubscriptionGuardMixin implements CanActivate {
    constructor(
      private readonly limitsService: SubscriptionLimitsService,
      private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const skip = this.reflector.getAllAndOverride<boolean | undefined>(SKIP_SUBSCRIPTION_GUARD_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (skip) {
        return true;
      }

      const request = context.switchToHttp().getRequest<Request>();
      const organizationId =
        request.organization?.id ?? request.session?.parentOrganizationId ?? request.session?.studentOrganizationId;

      if (!organizationId) {
        throw new ForbiddenException("No organization context for this request");
      }

      const limits = await this.limitsService.getOrganizationLimits(organizationId);
      if (!allowedPlans.includes(limits.planSlug)) {
        const requiredPlan = PLAN_NAMES[allowedPlans[0]] ?? allowedPlans[0];
        throw new ForbiddenException(`This feature requires the ${requiredPlan} plan or higher.`);
      }

      return true;
    }
  }

  return mixin(SubscriptionGuardMixin);
}
