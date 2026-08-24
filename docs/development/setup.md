# Development Setup

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Redis 7+

## Install

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and set `DATABASE_URL` and `REDIS_URL` for your local
PostgreSQL and Redis instances.

### Local Postgres/Redis via portable binaries

This environment doesn't have Postgres or Redis installed as system
services — instead there are portable, no-install binaries under
`~/tools/pg` (PostgreSQL 16.4, data dir `~/tools/pg/data`, port `5433`) and
`~/tools/redis` (Redis 5.0, port `6379`), started as plain background
processes rather than Windows services.

Two scripts manage them:

```bat
scripts\start-db.bat
scripts\stop-db.bat
```

`start-db.bat` checks whether each service is already running before
starting it (safe to run repeatedly), and prints a status line for both at
the end. `stop-db.bat` shuts Postgres down gracefully via `pg_ctl stop` and
Redis via `redis-cli shutdown`.

Because Postgres is on port `5433` (not the default `5432`), `apps/api/.env`
should point at it accordingly, e.g.:

```
DATABASE_URL="postgresql://postgres@127.0.0.1:5433/crm_os?schema=public"
REDIS_URL="redis://127.0.0.1:6379"
```

Run `scripts\start-db.bat` before `db:push` / `db:seed` / `pnpm --filter
@crm/api dev`, and `scripts\stop-db.bat` when you're done. If you have real
Postgres/Redis installations elsewhere (a Windows service, WSL, Docker,
another machine), use those instead and skip these scripts entirely.

## Database

```bash
pnpm --filter @crm/api db:push
pnpm --filter @crm/api db:seed
```

## Run

In one terminal:

```bash
pnpm --filter @crm/api dev
```

In a second terminal:

```bash
pnpm --filter @crm/web dev
```

The API listens on `http://localhost:3000` (routes prefixed with `/api`), and
the web app on `http://localhost:5173`, which proxies `/api` to the backend.

## Demo login

```
email:    owner@democrm.com
password: DemoPass123!
```
