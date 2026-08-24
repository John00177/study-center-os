import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { StudentsService } from "../students/students.service";
import { AuthenticatedGuard } from "./guards/authenticated.guard";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";
import { AuthService, RoleLoginResult } from "./auth.service";
import { StudentLoginDto } from "../students/dto/student-login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

type LoginRole = "owner" | "teacher" | "reception" | "platform_admin";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Shared tail end of every role-specific login below: establish the
   * passport session (clearing any leftover student session first, so a
   * browser can't end up authenticated as both at once) and shape the
   * response the frontend needs to route + set its active org.
   */
  private async completeLogin(req: Request, role: LoginRole, result: RoleLoginResult) {
    delete req.session.studentId;
    delete req.session.studentOrganizationId;

    const { password: _password, tempPassword: _tempPassword, ...safeUser } = result.user;
    await new Promise<void>((resolve, reject) => {
      req.logIn(safeUser, (err) => (err ? reject(err) : resolve()));
    });

    return {
      ...safeUser,
      role,
      organizationSlug: result.organizationSlug,
      teacherId: result.teacherId ?? null,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("owner-login")
  async ownerLogin(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.validateOwnerLogin(dto.email, dto.password);
    return this.completeLogin(req, "owner", result);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("teacher-login")
  async teacherLogin(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.validateTeacherLogin(dto.email, dto.password);
    return this.completeLogin(req, "teacher", result);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("reception-login")
  async receptionLogin(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.validateReceptionLogin(dto.email, dto.password);
    return this.completeLogin(req, "reception", result);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("platform-login")
  async platformLogin(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.validatePlatformLogin(dto.email, dto.password);
    return this.completeLogin(req, "platform_admin", result);
  }

  // ---- Public signup (no auth) ----

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("signup")
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Get("check-slug")
  async checkSlug(@Query("slug") slug: string) {
    if (!slug) {
      throw new BadRequestException("slug query parameter is required");
    }
    const available = await this.authService.isSlugAvailable(slug);
    return { available };
  }

  @UseGuards(AuthenticatedGuard)
  @HttpCode(204)
  @Post("logout")
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.logout((err) => {
        if (err) {
          reject(err);
          return;
        }
        req.session.destroy(() => {
          res.clearCookie(process.env.SESSION_COOKIE_NAME ?? "crm.sid");
          resolve();
        });
      });
    });
  }

  // Deliberately NOT behind TenancyGuard: a platform admin has no
  // x-organization-id to send at all, so org context is resolved inline
  // here instead, only for non-platform-admin users.
  @UseGuards(AuthenticatedGuard)
  @Get("me")
  async me(@Req() req: Request) {
    const user = req.user as Express.User;

    if (user.isPlatformAdmin) {
      return { ...user, role: "platform_admin" as const, organizationSlug: null, isTeacherDashboardActive: false };
    }

    const orgSlug = req.header("x-organization-id");
    if (!orgSlug) {
      throw new ForbiddenException("Missing x-organization-id header");
    }
    const organization = await this.prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!organization) {
      throw new ForbiddenException("Unknown organization");
    }
    const membership = await this.prisma.userOrganizationRole.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
      include: { role: true },
    });
    if (!membership || membership.status !== "active") {
      throw new ForbiddenException("Not a member of this organization");
    }

    let isTeacherDashboardActive = false;
    if (membership.role.slug === "teacher") {
      const teacher = await this.prisma.teacher.findFirst({
        where: { organizationId: organization.id, userId: user.id },
      });
      if (teacher) {
        const access = await this.prisma.teacherDashboardAccess.findFirst({
          where: { organizationId: organization.id, teacherId: teacher.id },
        });
        isTeacherDashboardActive = access?.status === "active";
      }
    }

    return { ...user, role: membership.role.slug, organizationSlug: organization.slug, isTeacherDashboardActive };
  }

  @UseGuards(AuthenticatedGuard)
  @HttpCode(200)
  @Post("change-password")
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    const user = req.user as Express.User;
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { success: true };
  }

  // ---- Student portal auth ----
  // Deliberately separate from the staff logins above: students aren't org
  // "members" (no UserOrganizationRole/passport session), so this writes a
  // lighter session shape directly (see common/types/express-session.d.ts)
  // instead of going through passport's session serializer.

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("student-login")
  async studentLogin(@Body() dto: StudentLoginDto, @Req() req: Request) {
    const orgSlug = req.header("x-organization-id");
    if (!orgSlug) {
      throw new BadRequestException("Missing x-organization-id header");
    }
    const organization = await this.prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!organization) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const student = await this.studentsService.validateStudentCredentials(
      organization.id,
      dto.identifier,
      dto.password,
    );

    // Symmetric to the staff logins above: clear any leftover passport
    // (staff) session first, so a browser that was previously
    // staff-authenticated doesn't keep req.isAuthenticated() === true
    // alongside the new student session.
    await new Promise<void>((resolve, reject) => {
      req.logout((err) => (err ? reject(err) : resolve()));
    });

    return new Promise((resolve, reject) => {
      req.session.studentId = student.id;
      req.session.studentOrganizationId = organization.id;
      req.session.save((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          id: student.id,
          name: student.name,
          phone: student.phone,
          email: student.email,
          mustChangePassword: student.mustChangePassword,
        });
      });
    });
  }

  @HttpCode(204)
  @Post("student-logout")
  studentLogout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err);
          return;
        }
        res.clearCookie(process.env.SESSION_COOKIE_NAME ?? "crm.sid");
        resolve();
      });
    });
  }

  @Get("student-me")
  async studentMe(@Req() req: Request) {
    if (!req.session.studentId || !req.session.studentOrganizationId) {
      throw new UnauthorizedException("Not logged in");
    }
    const student = await this.prisma.student.findFirst({
      where: { id: req.session.studentId, organizationId: req.session.studentOrganizationId },
    });
    if (!student || student.status !== "active") {
      throw new UnauthorizedException("Not logged in");
    }
    return {
      id: student.id,
      name: student.name,
      phone: student.phone,
      email: student.email,
      mustChangePassword: student.mustChangePassword,
    };
  }

  @HttpCode(200)
  @Post("student-change-password")
  async studentChangePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    if (!req.session.studentId) {
      throw new UnauthorizedException("Not logged in");
    }
    await this.studentsService.changeStudentPassword(req.session.studentId, dto.currentPassword, dto.newPassword);
    return { success: true };
  }

  // ---- Parent portal auth ----
  // Same lighter, non-passport session pattern as the student portal above —
  // a parent isn't its own account row, it's the parentEmail/parentPhone/
  // parentPassword fields on the Student they're attached to.

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("parent-login")
  async parentLogin(@Body() dto: StudentLoginDto, @Req() req: Request) {
    const orgSlug = req.header("x-organization-id");
    if (!orgSlug) {
      throw new BadRequestException("Missing x-organization-id header");
    }
    const organization = await this.prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!organization) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (organization.status !== "active" && organization.status !== "trial") {
      throw new ForbiddenException("Your account has been suspended. Contact support.");
    }

    const student = await this.studentsService.validateParentCredentials(
      organization.id,
      dto.identifier,
      dto.password,
    );

    // Clear any leftover staff or student session first, so a browser can't
    // end up authenticated as more than one session type at once.
    await new Promise<void>((resolve, reject) => {
      req.logout((err) => (err ? reject(err) : resolve()));
    });
    delete req.session.studentId;
    delete req.session.studentOrganizationId;

    return new Promise((resolve, reject) => {
      req.session.parentStudentId = student.id;
      req.session.parentOrganizationId = organization.id;
      req.session.save((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          studentId: student.id,
          studentName: student.name,
          parentName: student.parentName,
          organizationName: organization.name,
          mustChangePassword: student.mustChangePassword,
        });
      });
    });
  }

  @HttpCode(204)
  @Post("parent-logout")
  parentLogout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err);
          return;
        }
        res.clearCookie(process.env.SESSION_COOKIE_NAME ?? "crm.sid");
        resolve();
      });
    });
  }

  @Get("parent-me")
  async parentMe(@Req() req: Request) {
    if (!req.session.parentStudentId || !req.session.parentOrganizationId) {
      throw new UnauthorizedException("Not logged in");
    }
    const student = await this.prisma.student.findFirst({
      where: { id: req.session.parentStudentId, organizationId: req.session.parentOrganizationId },
    });
    if (!student || student.status !== "active") {
      throw new UnauthorizedException("Not logged in");
    }
    const organization = await this.prisma.organization.findUnique({
      where: { id: req.session.parentOrganizationId },
    });
    return {
      studentId: student.id,
      studentName: student.name,
      parentName: student.parentName,
      organizationName: organization?.name ?? "",
      mustChangePassword: student.mustChangePassword,
    };
  }

  @HttpCode(200)
  @Post("parent-change-password")
  async parentChangePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    if (!req.session.parentStudentId) {
      throw new UnauthorizedException("Not logged in");
    }
    await this.studentsService.changeParentPassword(req.session.parentStudentId, dto.currentPassword, dto.newPassword);
    return { success: true };
  }
}
