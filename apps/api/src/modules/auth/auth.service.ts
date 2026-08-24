import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { IdentityService } from "../identity/identity.service";
import { SignupDto } from "./dto/signup.dto";

const RESERVED_SLUGS = ["admin", "api", "login", "signup", "student", "platform", "www"];
const OWNER_ROLE_SLUGS = ["owner", "admin", "manager"];
const ACTIVE_ORG_STATUSES = ["active", "trial"];

export interface RoleLoginResult {
  user: User;
  organizationSlug: string | null;
  teacherId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly identityService: IdentityService,
    private readonly prisma: PrismaService,
  ) {}

  /** Shared first step for every role-specific login below: email/password only. */
  private async verifyPassword(email: string, password: string): Promise<User> {
    const user = await this.identityService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
    }
    if (user.status !== "active") {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS", message: "Account is not active" });
    }
    const passwordValid = await this.identityService.verifyPassword(user.password, password);
    if (!passwordValid) {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
    }
    return user;
  }

  private assertOrgStatus(status: string) {
    if (status === "pending") {
      throw new ForbiddenException({
        code: "ORG_PENDING",
        message: "Your application is pending approval. Please wait for admin confirmation.",
      });
    }
    if (!ACTIVE_ORG_STATUSES.includes(status)) {
      throw new ForbiddenException({
        code: "ORG_SUSPENDED",
        message: "Your account has been suspended. Contact support.",
      });
    }
  }

  async validateOwnerLogin(email: string, password: string): Promise<RoleLoginResult> {
    const user = await this.verifyPassword(email, password);

    const membership = await this.prisma.userOrganizationRole.findFirst({
      where: { userId: user.id, role: { slug: { in: OWNER_ROLE_SLUGS } } },
      include: { organization: true },
    });
    if (!membership) {
      throw new ForbiddenException({
        code: "WRONG_ROLE",
        message: "This account is not a study center owner/admin. Use the correct portal to sign in.",
      });
    }

    this.assertOrgStatus(membership.organization.status);
    return { user, organizationSlug: membership.organization.slug };
  }

  async validateReceptionLogin(email: string, password: string): Promise<RoleLoginResult> {
    const user = await this.verifyPassword(email, password);

    const membership = await this.prisma.userOrganizationRole.findFirst({
      where: { userId: user.id, role: { slug: "reception" } },
      include: { organization: true },
    });
    if (!membership) {
      throw new ForbiddenException({
        code: "WRONG_ROLE",
        message: "This account is not a receptionist. Use the correct portal to sign in.",
      });
    }

    this.assertOrgStatus(membership.organization.status);
    return { user, organizationSlug: membership.organization.slug };
  }

  async validateTeacherLogin(email: string, password: string): Promise<RoleLoginResult> {
    const user = await this.verifyPassword(email, password);

    const membership = await this.prisma.userOrganizationRole.findFirst({
      where: { userId: user.id, role: { slug: "teacher" } },
      include: { organization: true },
    });
    if (!membership) {
      throw new ForbiddenException({
        code: "WRONG_ROLE",
        message: "This account is not a teacher. Use the correct portal to sign in.",
      });
    }

    this.assertOrgStatus(membership.organization.status);

    const teacher = await this.prisma.teacher.findFirst({
      where: { organizationId: membership.organizationId, userId: user.id },
    });
    if (!teacher) {
      throw new ForbiddenException({
        code: "TEACHER_DASHBOARD_INACTIVE",
        message: "No teacher profile is linked to this account.",
      });
    }

    const access = await this.prisma.teacherDashboardAccess.findFirst({
      where: { organizationId: membership.organizationId, teacherId: teacher.id },
    });
    if (!access || access.status !== "active") {
      throw new ForbiddenException({
        code: "TEACHER_DASHBOARD_INACTIVE",
        message: "Your teacher dashboard access has not been activated yet. Ask an admin to activate it.",
      });
    }

    return { user, organizationSlug: membership.organization.slug, teacherId: teacher.id };
  }

  async validatePlatformLogin(email: string, password: string): Promise<RoleLoginResult> {
    const user = await this.verifyPassword(email, password);

    if (!user.isPlatformAdmin) {
      throw new ForbiddenException({
        code: "WRONG_ROLE",
        message: "This account does not have platform admin access.",
      });
    }

    // Platform admin is not tied to any single organization — sees all of them.
    return { user, organizationSlug: null };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.identityService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("Not logged in");
    }
    const valid = await this.identityService.verifyPassword(user.password, currentPassword);
    if (!valid) {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS", message: "Current password is incorrect" });
    }

    const passwordHash = await this.identityService.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash, mustChangePassword: false, tempPassword: null },
    });
  }

  /** The org slug to use for x-organization-id on subsequent requests, resolved post-login. */
  async getPrimaryOrganizationSlug(userId: string): Promise<string | null> {
    const membership = await this.prisma.userOrganizationRole.findFirst({
      where: { userId },
      include: { organization: true },
    });
    return membership?.organization.slug ?? null;
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 3 || RESERVED_SLUGS.includes(slug)) {
      return false;
    }
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    return !existing;
  }

  async signup(dto: SignupDto) {
    const slugAvailable = await this.isSlugAvailable(dto.slug);
    if (!slugAvailable) {
      throw new ConflictException("This URL slug is already taken or reserved");
    }

    const existingUser = await this.identityService.findByEmail(dto.ownerEmail);
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await this.identityService.hashPassword(dto.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.ownerEmail,
          name: dto.ownerName,
          password: passwordHash,
          status: "active",
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: dto.slug,
          status: "pending",
          settings: { timezone: "Asia/Tashkent", currency: "UZS", locale: "uz" },
          ownerName: dto.ownerName,
          ownerEmail: dto.ownerEmail,
          ownerPhone: dto.ownerPhone,
          country: dto.country,
          city: dto.city,
          address: dto.address,
        },
      });

      const ownerRole = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: "Owner",
          slug: "owner",
          isSystem: true,
        },
      });

      const financeViewPermission = await tx.permission.upsert({
        where: { slug: "finance.view" },
        update: {},
        create: { slug: "finance.view", name: "View finance data" },
      });
      await tx.rolePermission.create({
        data: { roleId: ownerRole.id, permissionId: financeViewPermission.id },
      });

      await tx.userOrganizationRole.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          roleId: ownerRole.id,
          status: "active",
          acceptedAt: new Date(),
        },
      });

      await tx.branch.create({
        data: {
          organizationId: organization.id,
          name: "Main Branch",
          slug: "main",
          status: "active",
        },
      });

      return organization;
    });

    return {
      success: true as const,
      message: "Application submitted. Pending approval.",
      organizationId: result.id,
    };
  }
}
