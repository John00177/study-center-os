import type { Organization, Role, User as PrismaUser, UserOrganizationRole } from "@prisma/client";

type MembershipWithRole = UserOrganizationRole & { role: Role };

declare global {
  namespace Express {
    interface User extends Pick<PrismaUser, "id" | "email" | "name" | "status" | "isPlatformAdmin" | "mustChangePassword"> {}

    interface Request {
      organization?: Organization;
      membership?: MembershipWithRole;
      teacherId?: string;
    }
  }
}

export {};
