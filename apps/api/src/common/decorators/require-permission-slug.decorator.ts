import { SetMetadata } from "@nestjs/common";

export const PERMISSION_SLUG_KEY = "requiredPermissionSlug";

/**
 * Restricts a route to callers whose role holds the given Permission slug
 * (via RolePermission), e.g. RequirePermissionSlug("finance.view").
 * Distinct from RequirePermission, which checks role slugs directly.
 */
export const RequirePermissionSlug = (slug: string) => SetMetadata(PERMISSION_SLUG_KEY, slug);
