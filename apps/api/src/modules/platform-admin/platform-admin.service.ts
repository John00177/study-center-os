import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OrganizationsQueryDto } from "./dto/organizations-query.dto";
import { PlatformRevenueQueryDto } from "./dto/platform-revenue-query.dto";
import { ApproveApplicationDto } from "./dto/approve-application.dto";
import { RejectApplicationDto } from "./dto/reject-application.dto";
import { UpdateOrganizationSettingsDto } from "./dto/update-organization-settings.dto";

function monthsAgo(n: number, from = new Date()) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - n, 1));
}

function safeDiv(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async getOrgStats(organizationId: string) {
    const [branchCount, teacherCount, studentCount, revenueAgg] = await Promise.all([
      this.prisma.branch.count({ where: { organizationId } }),
      this.prisma.teacher.count({ where: { organizationId } }),
      this.prisma.student.count({ where: { organizationId, status: "active" } }),
      this.prisma.payment.aggregate({ where: { organizationId }, _sum: { amount: true } }),
    ]);
    return { branchCount, teacherCount, studentCount, totalRevenue: revenueAgg._sum.amount ?? 0 };
  }

  async getAllOrganizations(filters: OrganizationsQueryDto) {
    const organizations = await this.prisma.organization.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.country ? { country: filters.country } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const orgIds = organizations.map((o) => o.id);
    const subscriptions = orgIds.length
      ? await this.prisma.subscription.findMany({
          where: { organizationId: { in: orgIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];
    const latestSubByOrg = new Map<string, (typeof subscriptions)[number]>();
    for (const sub of subscriptions) {
      if (!latestSubByOrg.has(sub.organizationId)) latestSubByOrg.set(sub.organizationId, sub);
    }
    const planIds = [...new Set(subscriptions.map((s) => s.planId))];
    const plans = planIds.length
      ? await this.prisma.subscriptionPlan.findMany({ where: { id: { in: planIds } } })
      : [];
    const planById = new Map(plans.map((p) => [p.id, p]));

    const results = await Promise.all(
      organizations.map(async (org) => {
        const sub = latestSubByOrg.get(org.id);
        const plan = sub ? planById.get(sub.planId) ?? null : null;
        const stats = await this.getOrgStats(org.id);
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
          ownerName: org.ownerName,
          ownerEmail: org.ownerEmail,
          ownerPhone: org.ownerPhone,
          country: org.country,
          city: org.city,
          address: org.address,
          createdAt: org.createdAt,
          subscription: sub
            ? {
                planName: plan?.name ?? "Unknown",
                status: sub.status,
                currentPeriodEnd: sub.currentPeriodEnd,
                amount: plan?.price ?? 0,
              }
            : null,
          stats,
        };
      }),
    );

    return filters.plan ? results.filter((r) => r.subscription?.planName === filters.plan) : results;
  }

  async getOrganizationDetail(id: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    const [branches, memberships, subscriptions, stats, auditLogs] = await Promise.all([
      this.prisma.branch.findMany({ where: { organizationId: id } }),
      this.prisma.userOrganizationRole.findMany({ where: { organizationId: id }, include: { role: true } }),
      this.prisma.subscription.findMany({ where: { organizationId: id }, orderBy: { createdAt: "desc" } }),
      this.getOrgStats(id),
      this.prisma.auditLog.findMany({
        where: { organizationId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const userIds = memberships.map((m) => m.userId);
    const users = userIds.length ? await this.prisma.user.findMany({ where: { id: { in: userIds } } }) : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const planIds = [...new Set(subscriptions.map((s) => s.planId))];
    const plans = planIds.length
      ? await this.prisma.subscriptionPlan.findMany({ where: { id: { in: planIds } } })
      : [];
    const planById = new Map(plans.map((p) => [p.id, p]));

    return {
      organization,
      branches,
      users: memberships.map((m) => ({
        userId: m.userId,
        name: userById.get(m.userId)?.name ?? "Unknown",
        email: userById.get(m.userId)?.email ?? "",
        role: m.role.name,
        status: m.status,
      })),
      subscriptionHistory: subscriptions.map((s) => ({
        id: s.id,
        planName: planById.get(s.planId)?.name ?? "Unknown",
        status: s.status,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        createdAt: s.createdAt,
      })),
      stats,
      auditLog: auditLogs.map((a) => ({ ...a, actorName: userById.get(a.actorId)?.name ?? null })),
    };
  }

  async getPlatformRevenue(filters: PlatformRevenueQueryDto) {
    const activeSubs = await this.prisma.subscription.findMany({ where: { status: "active" } });
    const planIds = [...new Set(activeSubs.map((s) => s.planId))];
    const plans = planIds.length
      ? await this.prisma.subscriptionPlan.findMany({ where: { id: { in: planIds } } })
      : [];
    const planById = new Map(plans.map((p) => [p.id, p]));

    // Simplifying assumption: every plan's price is a monthly amount (this
    // demo only seeds monthly-interval plans, so no annual normalization).
    const totalMrr = activeSubs.reduce((sum, s) => sum + (planById.get(s.planId)?.price ?? 0), 0);
    const totalArr = totalMrr * 12;

    const where = {
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            },
          }
        : {}),
    };
    const payments = await this.prisma.platformPayment.findMany({ where });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    const monthlyRows = await this.prisma.$queryRaw<{ month: Date; amount: number }[]>`
      SELECT date_trunc('month', created_at) AS month, COALESCE(SUM(amount), 0)::float AS amount
      FROM platform_payments
      WHERE created_at >= ${monthsAgo(11)}
      GROUP BY month ORDER BY month ASC
    `;
    const monthlyRevenue = monthlyRows.map((r) => ({ month: r.month.toISOString().slice(0, 7), amount: r.amount }));

    const revenueByPlanMap = new Map<string, number>();
    for (const sub of activeSubs) {
      const plan = planById.get(sub.planId);
      if (!plan) continue;
      revenueByPlanMap.set(plan.name, (revenueByPlanMap.get(plan.name) ?? 0) + plan.price);
    }
    const revenueByPlan = [...revenueByPlanMap.entries()].map(([planName, amount]) => ({ planName, amount }));

    const [allSubsCount, cancelledCount, activeOrgs, trialOrgs, suspendedOrgs] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: "cancelled" } }),
      this.prisma.organization.count({ where: { status: "active" } }),
      this.prisma.organization.count({ where: { status: "trial" } }),
      this.prisma.organization.count({ where: { status: "suspended" } }),
    ]);

    return {
      totalMrr,
      totalArr,
      totalRevenue,
      monthlyRevenue,
      revenueByPlan,
      churnRate: safeDiv(cancelledCount, allSubsCount) * 100,
      activeOrganizations: activeOrgs,
      trialOrganizations: trialOrgs,
      suspendedOrganizations: suspendedOrgs,
    };
  }

  async getPlatformHealth() {
    const [totalOrganizations, totalActiveStudents, totalBranches, totalGroups, teachersWithActiveAccess] =
      await Promise.all([
        this.prisma.organization.count(),
        this.prisma.student.count({ where: { status: "active" } }),
        this.prisma.branch.count(),
        this.prisma.group.count(),
        this.prisma.teacherDashboardAccess.count({ where: { status: "active" } }),
      ]);

    const organizations = await this.prisma.organization.findMany();
    const revenueByOrg = await Promise.all(
      organizations.map(async (org) => {
        const agg = await this.prisma.payment.aggregate({
          where: { organizationId: org.id },
          _sum: { amount: true },
        });
        return { name: org.name, revenue: agg._sum.amount ?? 0 };
      }),
    );
    const totalRevenueAllOrgs = revenueByOrg.reduce((sum, r) => sum + r.revenue, 0);
    const topOrganizationsByRevenue = [...revenueByOrg].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      totalOrganizations,
      totalActiveStudents,
      totalActiveTeachers: teachersWithActiveAccess,
      totalBranches,
      totalGroups,
      avgStudentsPerOrg: safeDiv(totalActiveStudents, totalOrganizations),
      avgRevenuePerOrg: safeDiv(totalRevenueAllOrgs, totalOrganizations),
      topOrganizationsByRevenue,
    };
  }

  async getSubscriptionPlans() {
    return this.prisma.subscriptionPlan.findMany({ orderBy: { price: "asc" } });
  }

  // ---- Applications (pending signups) ----

  async getPendingApplications() {
    const organizations = await this.prisma.organization.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      ownerName: org.ownerName,
      ownerEmail: org.ownerEmail,
      ownerPhone: org.ownerPhone,
      country: org.country,
      city: org.city,
      address: org.address,
      createdAt: org.createdAt,
    }));
  }

  async approveApplication(id: string, actorId: string, dto: ApproveApplicationDto) {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) {
      throw new NotFoundException("Application not found");
    }
    if (organization.status !== "pending") {
      throw new BadRequestException("This application has already been reviewed");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id },
        data: { status: "trial", ...(dto.hasBranches !== undefined ? { hasBranches: dto.hasBranches } : {}) },
      });

      if (dto.planId) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        await tx.subscription.create({
          data: {
            organizationId: id,
            planId: dto.planId,
            status: "trialing",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
      }

      return org;
    });

    await this.auditService.record({
      organizationId: id,
      actorId,
      action: "platform.application_approved",
      entityType: "Organization",
      entityId: id,
      metadata: dto.planId ? { planId: dto.planId } : undefined,
    });

    return updated;
  }

  async rejectApplication(id: string, actorId: string, dto: RejectApplicationDto) {
    const organization = await this.prisma.organization.findUnique({ where: { id } });
    if (!organization) {
      throw new NotFoundException("Application not found");
    }
    if (organization.status !== "pending") {
      throw new BadRequestException("This application has already been reviewed");
    }

    // Rejected orgs are marked "suspended" rather than deleted — the
    // applicant and their audit trail stay in the system (same "never
    // destroy history" reasoning as elsewhere in this codebase), and a
    // platform admin can still reverse the decision via activateOrganization.
    const updated = await this.prisma.organization.update({ where: { id }, data: { status: "suspended" } });

    await this.auditService.record({
      organizationId: id,
      actorId,
      action: "platform.application_rejected",
      entityType: "Organization",
      entityId: id,
      metadata: dto.reason ? { reason: dto.reason } : undefined,
    });

    return updated;
  }

  async suspendOrganization(id: string, actorId: string, reason: string | undefined) {
    const existing = await this.prisma.organization.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Organization not found");
    }

    const organization = await this.prisma.organization.update({ where: { id }, data: { status: "suspended" } });

    await this.auditService.record({
      organizationId: id,
      actorId,
      action: "platform.organization_suspended",
      entityType: "Organization",
      entityId: id,
      metadata: reason ? { reason } : undefined,
    });

    return organization;
  }

  /** Lets a platform admin flip hasBranches (and future org-level settings) for any org, not just at approval time. */
  async updateOrganizationSettings(id: string, actorId: string, dto: UpdateOrganizationSettingsDto) {
    const existing = await this.prisma.organization.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Organization not found");
    }

    const organization = await this.prisma.organization.update({ where: { id }, data: dto });

    await this.auditService.record({
      organizationId: id,
      actorId,
      action: "platform.organization_settings_updated",
      entityType: "Organization",
      entityId: id,
      beforeValue: { hasBranches: existing.hasBranches },
      afterValue: { hasBranches: organization.hasBranches },
    });

    return organization;
  }

  async activateOrganization(id: string, actorId: string) {
    const existing = await this.prisma.organization.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Organization not found");
    }

    const organization = await this.prisma.organization.update({ where: { id }, data: { status: "active" } });

    await this.auditService.record({
      organizationId: id,
      actorId,
      action: "platform.organization_activated",
      entityType: "Organization",
      entityId: id,
    });

    return organization;
  }
}
