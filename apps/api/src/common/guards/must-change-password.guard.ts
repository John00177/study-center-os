import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";

// Any request whose path falls under one of these prefixes is always let
// through, regardless of mustChangePassword — this is deliberately a small,
// simple allowlist (auth flows + public branding needed to render the login
// screen) rather than an exhaustive per-route list, since the alternative
// (denylisting) risks silently leaving a new route unprotected.
const ALLOWED_PREFIXES = ["/api/auth/", "/api/organizations/", "/api/health"];

/**
 * Global (APP_GUARD) — once an account has a pending forced password
 * change (owner/admin-created teacher or receptionist, or a
 * reception-created student/parent), every route except auth endpoints and
 * public branding 403s until they change it. Enforced here as the primary
 * control per Adjustment ("mustChangePassword blocks ALL other routes");
 * the frontend redirect is UX convenience on top, not the real boundary.
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (ALLOWED_PREFIXES.some((prefix) => request.path.startsWith(prefix))) {
      return true;
    }

    if (request.user && (request.user as Express.User).mustChangePassword) {
      throw new ForbiddenException({
        code: "MUST_CHANGE_PASSWORD",
        message: "You must change your password before continuing.",
      });
    }

    if (request.session?.studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: request.session.studentId },
        select: { mustChangePassword: true },
      });
      if (student?.mustChangePassword) {
        throw new ForbiddenException({
          code: "MUST_CHANGE_PASSWORD",
          message: "You must change your password before continuing.",
        });
      }
    }

    if (request.session?.parentStudentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: request.session.parentStudentId },
        select: { mustChangePassword: true },
      });
      if (student?.mustChangePassword) {
        throw new ForbiddenException({
          code: "MUST_CHANGE_PASSWORD",
          message: "You must change your password before continuing.",
        });
      }
    }

    return true;
  }
}
