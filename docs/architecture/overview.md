# Architecture Overview

## Stack

| Layer      | Technology                                                  |
| ---------- | ------------------------------------------------------------ |
| Backend    | NestJS 10, TypeScript (strict), Prisma 5, PostgreSQL          |
| Frontend   | React 18, Vite, Tailwind CSS, Zustand, TanStack Query          |
| Auth       | express-session + connect-redis + Redis, Argon2id, HTTP-only cookies |
| Monorepo   | Turborepo + pnpm workspaces                                   |

## Multi-tenancy

Every tenant-scoped table (`Contact`, `Company`, `Deal`, `Activity`, `Pipeline`,
`Tag`, `AuditLog`) carries an `organizationId` foreign key to `Organization`.
A request is scoped to a tenant via the `x-organization-id` header, which
carries the organization's `slug`. `TenancyGuard` resolves the slug to an
`Organization`, verifies the caller has an active `TeamMember` row for that
organization, and populates a request-scoped `TenancyService` with the
resolved `organizationId`/`userId`. All CRM services take `organizationId`
explicitly and filter every query by it — see [rls.md](./rls.md) for the
current state of enforcement and what's not yet in place.

## CRM domain entities

- **Organization** — the tenant root.
- **User** / **TeamMember** — a person, and their role/status within an org.
- **Contact**, **Company** — the core CRM records, each owned by a `User`.
- **Pipeline** / **PipelineStage** — configurable sales pipelines.
- **Deal** — an opportunity tied to a pipeline stage, contact, and/or company.
- **Activity** — calls, meetings, tasks, emails, notes, demos tied to any of
  the above.
- **Tag** — free-form per-organization labels.
- **AuditLog** — an append-only log of create/update/delete actions.

## Auth

Authentication is session-based: `express-session` persists sessions in
Redis via `connect-redis`, Passport's local strategy validates
email/password against an Argon2id hash, and the session cookie is
`httpOnly`, `sameSite=lax`, and `secure` in production. There is no JWT —
the browser only ever holds an opaque session cookie, and the server is the
source of truth for session state.

Authorization on top of the session is role-based: `PermissionGuard` reads
the `TeamMember.role` resolved by `TenancyGuard` and compares it against the
roles declared with `@RequirePermission(...)` on a given route.
