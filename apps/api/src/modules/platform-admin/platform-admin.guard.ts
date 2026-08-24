import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.isAuthenticated || !request.isAuthenticated()) {
      throw new UnauthorizedException("Authentication required");
    }

    const user = request.user as Express.User | undefined;
    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException("Platform admin access only");
    }

    return true;
  }
}
