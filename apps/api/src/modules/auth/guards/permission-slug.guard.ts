import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { PERMISSION_SLUG_KEY } from "../../../common/decorators/require-permission-slug.decorator";
import { IdentityService } from "../../identity/identity.service";

@Injectable()
export class PermissionSlugGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identityService: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredSlug = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_SLUG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredSlug) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { id: string } | undefined;
    const organizationId = request.organization?.id;

    if (!user || !organizationId) {
      throw new ForbiddenException("You do not have permission to perform this action");
    }

    const allowed = await this.identityService.hasPermission(organizationId, user.id, requiredSlug);
    if (!allowed) {
      throw new ForbiddenException("You do not have permission to perform this action");
    }

    return true;
  }
}
