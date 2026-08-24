import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SubscriptionLimitsService } from "./subscription-limits.service";

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limitsService: SubscriptionLimitsService,
    private readonly auditService: AuditService,
  ) {}

  findCurrentSubscription(organizationId: string) {
    return this.prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({ orderBy: { price: "asc" } });
  }

  async getCurrentPlanSummary(organizationId: string) {
    const [subscription, limits, usage] = await Promise.all([
      this.findCurrentSubscription(organizationId),
      this.limitsService.getOrganizationLimits(organizationId),
      this.limitsService.getCurrentUsage(organizationId),
    ]);

    return {
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
      plan: { slug: limits.planSlug, name: limits.planName },
      limits: { maxBranches: limits.maxBranches, maxStudents: limits.maxStudents, maxTeachers: limits.maxTeachers },
      allowedModules: limits.allowedModules,
      usage,
    };
  }

  async getLimitBreakdown(organizationId: string) {
    const [limits, usage] = await Promise.all([
      this.limitsService.getOrganizationLimits(organizationId),
      this.limitsService.getCurrentUsage(organizationId),
    ]);

    function entry(current: number, limit: number | null) {
      const percentage = limit ? Math.round((current / limit) * 100) : 0;
      return { current, limit, percentage };
    }

    return {
      planSlug: limits.planSlug,
      planName: limits.planName,
      branches: { resource: "branch" as const, ...entry(usage.branchCount, limits.maxBranches) },
      students: { resource: "student" as const, ...entry(usage.studentCount, limits.maxStudents) },
      teachers: { resource: "teacher" as const, ...entry(usage.teacherCount, limits.maxTeachers) },
    };
  }

  async changePlan(organizationId: string, actorId: string, planId: string) {
    const [subscription, plan] = await Promise.all([
      this.findCurrentSubscription(organizationId),
      this.prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
    ]);
    if (!plan) {
      throw new NotFoundException("Plan not found");
    }
    if (!subscription) {
      throw new BadRequestException("This organization has no active subscription to change");
    }

    const previousPlan = await this.prisma.subscriptionPlan.findUnique({ where: { id: subscription.planId } });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { planId: plan.id, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd },
    });

    // MVP billing: full amount charged and marked paid immediately, no
    // proration — matches the ticket's "or full amount for MVP" note.
    const invoice = await this.prisma.platformInvoice.create({
      data: {
        organizationId,
        subscriptionId: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        status: "paid",
        dueDate: now,
        paidAt: now,
      },
    });
    await this.prisma.platformPayment.create({
      data: {
        organizationId,
        invoiceId: invoice.id,
        amount: plan.price,
        currency: plan.currency,
        paymentMethod: "card",
        status: "succeeded",
      },
    });

    const isUpgrade = (previousPlan?.price ?? 0) < plan.price;
    await this.auditService.record({
      organizationId,
      actorId,
      action: isUpgrade ? "subscription.upgraded" : "subscription.downgraded",
      entityType: "Subscription",
      entityId: subscription.id,
      beforeValue: { planId: subscription.planId, planSlug: previousPlan?.slug } as unknown as Prisma.InputJsonValue,
      afterValue: { planId: plan.id, planSlug: plan.slug } as unknown as Prisma.InputJsonValue,
    });

    return this.getCurrentPlanSummary(organizationId);
  }

  async cancelSubscription(organizationId: string, actorId: string) {
    const subscription = await this.findCurrentSubscription(organizationId);
    if (!subscription) {
      throw new BadRequestException("This organization has no active subscription to cancel");
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "cancelled" },
    });
    // MVP: suspend immediately rather than scheduling for period end.
    await this.prisma.organization.update({ where: { id: organizationId }, data: { status: "suspended" } });

    await this.auditService.record({
      organizationId,
      actorId,
      action: "subscription.cancelled",
      entityType: "Subscription",
      entityId: subscription.id,
      afterValue: { status: "cancelled" } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }
}
