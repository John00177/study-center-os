import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "requiredRoleSlugs";

/**
 * Restricts a route to callers whose Role.slug (for the active organization)
 * is one of the given values, e.g. RequirePermission("owner", "admin").
 */
export const RequirePermission = (...roleSlugs: string[]) => SetMetadata(PERMISSION_KEY, roleSlugs);
