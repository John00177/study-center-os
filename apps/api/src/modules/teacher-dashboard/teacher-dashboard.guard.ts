import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";

const ADMIN_ROLES = ["owner", "admin"];

/**
 * Guards every /teacher/* route. A "teacher" role user must have an ACTIVE
 * TeacherDashboardAccess record for their linked Teacher — this is a
 * separate switch from their account status (see Student Center OS Security
 * Rule 3: account active + dashboard suspended still can't use the dashboard).
 * Owner/admin may pass through, optionally viewing a specific teacher's data
 * via ?teacherId=.
 */
@Injectable()
export class TeacherDashboardGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { id: string } | undefined;
    const organizationId = request.organization?.id;
    const roleSlug = request.membership?.role.slug;

    if (!user || !organizationId || !roleSlug) {
      throw new ForbiddenException("Teacher dashboard not activated");
    }

    if (ADMIN_ROLES.includes(roleSlug)) {
      const queryTeacherId = request.query.teacherId;
      if (typeof queryTeacherId === "string" && queryTeacherId) {
        request.teacherId = queryTeacherId;
      } else {
        const ownTeacher = await this.prisma.teacher.findFirst({
          where: { organizationId, userId: user.id },
        });
        request.teacherId = ownTeacher?.id;
      }
      return true;
    }

    if (roleSlug !== "teacher") {
      throw new ForbiddenException("Teacher dashboard not activated");
    }

    const teacher = await this.prisma.teacher.findFirst({ where: { organizationId, userId: user.id } });
    if (!teacher) {
      throw new ForbiddenException("Teacher dashboard not activated");
    }

    const access = await this.prisma.teacherDashboardAccess.findFirst({
      where: { organizationId, teacherId: teacher.id },
    });
    if (!access || access.status !== "active") {
      throw new ForbiddenException("Teacher dashboard not activated");
    }

    request.teacherId = teacher.id;
    return true;
  }
}
