import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";

/**
 * Guards every /student/* route. Students authenticate via a lighter,
 * non-passport session (see auth.controller.ts student-login) — this checks
 * that raw session data directly rather than req.isAuthenticated()/req.user,
 * which only ever reflects staff passport sessions.
 */
@Injectable()
export class StudentPortalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.session.studentId || !request.session.studentOrganizationId) {
      throw new UnauthorizedException("Student login required");
    }
    return true;
  }
}
