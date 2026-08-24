# Row-Level Security: Current Status

**Tenant isolation today is enforced entirely at the application layer, not
in Postgres.** This document is an honest statement of what is and isn't in
place — no security theater.

## What's actually enforced

- `TenancyGuard` resolves the `x-organization-id` header to an
  `Organization` and confirms the authenticated user has an active
  `TeamMember` row for it.
- Every CRM service method (`ContactsService`, `CompaniesService`,
  `DealsService`, `ActivitiesService`, `PipelinesService`) takes
  `organizationId` as an explicit parameter, sourced from the request-scoped
  `TenancyService`, and filters/scopes every Prisma query by it.
- `PermissionGuard` restricts mutating routes by `TeamMember.role`.

This means isolation depends on every query in every service correctly
filtering by `organizationId`. There is nothing at the database layer today
stopping a query that forgets to do so.

## What's prepared but not enforced

`PrismaService.setTenant(organizationId)` exists as a placeholder hook for a
future Prisma middleware that would:

1. Set a session-scoped Postgres variable (e.g. `app.current_organization_id`)
   at the start of each request.
2. Rely on Postgres Row-Level Security policies on each tenant-scoped table
   to reject any row access outside that session's organization, as a
   defense-in-depth backstop independent of application code.

`setTenant` is currently a no-op. Wiring it up requires:

- A Prisma `$use` middleware (or Prisma Client extension) that calls
  `SET LOCAL app.current_organization_id = ...` inside every request's
  transaction/connection.
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` plus `CREATE POLICY` statements
  for every tenant-scoped table, added as a migration.
- Verifying Prisma's connection pooling doesn't leak the session variable
  across requests (this is the main reason it isn't done yet — it needs
  care with `$transaction` and connection reuse).

## Bottom line

If you're evaluating this project for a use case where a single bug in
service-layer filtering would be a serious incident, treat that as an open
risk today, not a solved problem.
