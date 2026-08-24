import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { PERMISSION_KEY } from "../../../common/decorators/require-permission.decorator";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoleSlugs = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoleSlugs || requiredRoleSlugs.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const roleSlug = request.membership?.role.slug;

    if (!roleSlug || !requiredRoleSlugs.includes(roleSlug)) {
      throw new ForbiddenException("You do not have permission to perform this action");
    }

    return true;
  }
}
