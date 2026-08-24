import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export type LimitResourceType = "branch" | "student" | "teacher";
export type PlanModule = "payment_reminders" | "homework" | "analytics" | "ai_tests" | "parent_portal" | "multi_branch_reports";

export interface PlanLimits {
  planSlug: string;
  planName: string;
  maxBranches: number | null; // null = unlimited
  maxStudents: number | null;
  maxTeachers: number | null;
  allowedModules: PlanModule[];
}

export interface UsageCounts {
  branchCount: number;
  studentCount: number;
  teacherCount: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
}

// Hardcoded tier definitions — the single source of truth for what each plan
// includes. SubscriptionPlan.features (Json) exists in the schema for
// display purposes only; enforcement always reads from here so a bad/missing
// features blob can never accidentally loosen a limit.
const PLAN_LIMITS: Record<string, Omit<PlanLimits, "planSlug" | "planName">> = {
  starter: {
    maxBranches: 1,
    maxStudents: 80,
    maxTeachers: 3,
    allowedModules: [],
  },
  growth: {
    maxBranches: 3,
    maxStudents: 500,
    maxTeachers: 20,
    allowedModules: ["payment_reminders", "homework", "analytics", "ai_tests"],
  },
  pro: {
    maxBranches: null,
    maxStudents: null,
    maxTeachers: null,
    allowedModules: ["payment_reminders", "homework", "analytics", "ai_tests", "parent_portal", "multi_branch_reports"],
  },
};

const MODULE_LABELS: Record<PlanModule, string> = {
  payment_reminders: "Payment reminders",
  homework: "Homework",
  analytics: "Analytics",
  ai_tests: "AI Test Generator",
  parent_portal: "Parent Portal",
  multi_branch_reports: "Multi-branch reports",
};

const RESOURCE_LABELS: Record<LimitResourceType, string> = {
  branch: "branch",
  student: "student",
  teacher: "teacher",
};

// An org with no subscription row (e.g. a fresh self-service signup that
// hasn't picked a plan yet) is treated as Starter — deny-by-default rather
// than accidentally unlimited.
const FALLBACK_PLAN_SLUG = "starter";

@Injectable()
export class SubscriptionLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationLimits(organizationId: string): Promise<PlanLimits> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { organizationId, status: { in: ["active", "trialing"] } },
      orderBy: { createdAt: "desc" },
    });

    const plan = subscription
      ? await this.prisma.subscriptionPlan.findUnique({ where: { id: subscription.planId } })
      : null;

    const slug = plan?.slug ?? FALLBACK_PLAN_SLUG;
    const tier = PLAN_LIMITS[slug] ?? PLAN_LIMITS[FALLBACK_PLAN_SLUG];

    return {
      planSlug: slug,
      planName: plan?.name ?? "Starter",
      ...tier,
    };
  }

  async getCurrentUsage(organizationId: string): Promise<UsageCounts> {
    const [branchCount, studentCount, teacherCount] = await Promise.all([
      this.prisma.branch.count({ where: { organizationId, status: "active" } }),
      this.prisma.student.count({ where: { organizationId, status: "active" } }),
      this.prisma.teacherDashboardAccess.count({ where: { organizationId, status: "active" } }),
    ]);
    return { branchCount, studentCount, teacherCount };
  }

  async checkLimit(organizationId: string, resourceType: LimitResourceType): Promise<LimitCheckResult> {
    const [limits, usage] = await Promise.all([
      this.getOrganizationLimits(organizationId),
      this.getCurrentUsage(organizationId),
    ]);

    const limit =
      resourceType === "branch" ? limits.maxBranches : resourceType === "student" ? limits.maxStudents : limits.maxTeachers;
    const current =
      resourceType === "branch" ? usage.branchCount : resourceType === "student" ? usage.studentCount : usage.teacherCount;

    if (limit === null) {
      return { allowed: true, current, limit: null, remaining: null };
    }

    return { allowed: current < limit, current, limit, remaining: Math.max(0, limit - current) };
  }

  async enforceLimit(organizationId: string, resourceType: LimitResourceType): Promise<void> {
    const [result, limits] = await Promise.all([
      this.checkLimit(organizationId, resourceType),
      this.getOrganizationLimits(organizationId),
    ]);
    if (!result.allowed) {
      throw new ForbiddenException(
        `You have reached your ${limits.planName} plan limit of ${result.limit} ${RESOURCE_LABELS[resourceType]}s. Upgrade to create more.`,
      );
    }
  }

  async hasModule(organizationId: string, module: PlanModule): Promise<boolean> {
    const limits = await this.getOrganizationLimits(organizationId);
    return limits.allowedModules.includes(module);
  }

  async enforceModule(organizationId: string, module: PlanModule): Promise<void> {
    const limits = await this.getOrganizationLimits(organizationId);
    if (!limits.allowedModules.includes(module)) {
      const requiredPlan = module === "parent_portal" || module === "multi_branch_reports" ? "Pro" : "Growth";
      throw new ForbiddenException(
        `${MODULE_LABELS[module]} requires the ${requiredPlan} plan or higher. You are on the ${limits.planName} plan.`,
      );
    }
  }
}
