import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async hashPassword(plainText: string): Promise<string> {
    return argon2.hash(plainText, { type: argon2.argon2id });
  }

  async verifyPassword(hash: string, plainText: string): Promise<boolean> {
    return argon2.verify(hash, plainText);
  }

  /**
   * Checks whether the user's role in the organization is granted the given
   * permission slug (e.g. "finance.view"), via Role -> RolePermission.
   */
  async hasPermission(organizationId: string, userId: string, permissionSlug: string): Promise<boolean> {
    const membership = await this.prisma.userOrganizationRole.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { roleId: true, status: true },
    });

    if (!membership || membership.status !== "active") {
      return false;
    }

    const grant = await this.prisma.rolePermission.findFirst({
      where: { roleId: membership.roleId, permission: { slug: permissionSlug } },
    });

    return grant !== null;
  }
}
