import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Guards every /parent/* route. Parents authenticate via a lighter,
 * non-passport session (see auth.controller.ts parent-login) keyed to the
 * child's Student row. Unlike StudentPortalGuard, this re-checks the
 * student's status against the DB on every request rather than trusting the
 * session alone — a parent's access should drop the moment their child is
 * suspended/dropped, not just at next login.
 */
@Injectable()
export class ParentPortalGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { parentStudentId, parentOrganizationId } = request.session;
    if (!parentStudentId || !parentOrganizationId) {
      throw new UnauthorizedException("Parent login required");
    }

    const student = await this.prisma.student.findFirst({
      where: { id: parentStudentId, organizationId: parentOrganizationId },
    });
    if (!student || student.status !== "active") {
      throw new UnauthorizedException("Parent login required");
    }

    return true;
  }
}
