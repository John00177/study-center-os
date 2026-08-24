import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { TenancyService } from "./tenancy.service";

@Injectable()
export class TenancyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancyService: TenancyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { id: string } | undefined;

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    const orgSlug = request.header("x-organization-id");
    if (!orgSlug) {
      throw new ForbiddenException("Missing x-organization-id header");
    }

    const organization = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

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

    this.tenancyService.setContext(organization.id, user.id);

    request.organization = organization;
    request.membership = membership;

    return true;
  }
}
