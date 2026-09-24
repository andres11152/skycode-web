# SkyCode Agency

Trilingual (Spanish/English/French) marketing site + internal CRM/project dashboard with real authentication, built with Next.js 16 (App Router) and PostgreSQL.

The public site (home, services, blog, portfolio) is static content served through the Node runtime — it is not a static export (`output: "export"` was deliberately removed, see `CLAUDE.md`). The internal dashboard (`/dashboard`, `/portal`) is a server-rendered application with persistent sessions, RBAC and Postgres.

## Requirements

- Node.js 20+
- PostgreSQL (local, or a managed instance such as Render)
- Docker, only if you're going to run the integration/E2E tests

## Getting started

```
npm install
cp .env.example .env.local # fill in DATABASE_URL, JWT_SECRET, etc. — see the file for details on each variable
npm run db:migrate # applies the migrations in db/migrations/ against DATABASE_URL
npm run dev
```

On first boot, if the `users` table is empty and you defined `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` in `.env.local`, the first admin user is automatically seeded the first time anything hits the database. Any account created after that is created by invitation from `/dashboard/equipo` (admin only) — there's no other way to create internal accounts. For development, `npm run db:seed-dev-users` creates one account per role (admin, sales_manager, traffiker, client) with a shared password printed to the terminal — do not use in production.

Open http://localhost:3000 for the public site, or `/login` for the internal dashboard.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serves the production build (run `npm run build` first) |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (vitest, no Postgres) |
| `npm run test:integration` | Query/lib tests against a disposable real Postgres — requires `test:db:up` first |
| `npm run test:e2e` | End-to-end tests against a real Next server — requires `test:db:up && test:db:migrate` first |
| `npm run test:all` | Chains the three test layers above, spinning up and migrating the test database |
| `npm run db:migrate` | Applies pending migrations from `db/migrations/` against `DATABASE_URL` |
| `npm run db:seed-dev-users` | Creates one account per role for local development |
| `node scripts/reset-admin-password.mjs <email> <password>` | Rotates an existing user's password from the command line — a fallback when the "forgot my password" flow (`/olvide-password`) isn't viable (e.g. Resend is down) |

## Project structure

```
src/
  app/                # Routes (App Router) — public site, /dashboard, /portal, /api/**
  components/
    sections/          # Home page sections (Hero, Services, Contact, ...)
    dashboard/, portal/ # Internal dashboard UI
    ui/                 # Reusable base components (Button, Modal, Card, ...)
  content/             # Typed copy; content/locales/{es,en,fr}/*.json is the source of truth
  lib/                 # Auth, RBAC, rate limiting, data access (lib/queries/), utilities
  db/migrations/       # SQL migrations, applied by scripts/migrate.mjs
  e2e/                 # End-to-end tests
  scripts/             # Maintenance CLIs (migrate, seed users, reset password)
```

For the real architecture detail — design system, i18n, RBAC/auth, data model, business flows and the mandatory verification flow before any change — see `CLAUDE.md`. That file is the project's living reference, not this README.

## Environment variables

See `.env.example` for the full list with an explanation of each one (database, JWT, Resend, site, Sentry). Error monitoring (Sentry) is optional — without `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`, the SDK stays inactive automatically.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: types, lint, unit tests and build first (fast, no Postgres); if that passes, a second job spins up a Postgres service and runs integration + E2E — the same scripts as above, no special CI logic.

## Testing

Three independent layers, each testing something different — see the "Internal system" section of `CLAUDE.md` for exactly what runs against what:

```
npm test                  # unit tests, instant, no external dependencies
npm run test:db:up        # spins up a disposable Postgres on :5433 (docker-compose.test.yml)
npm run test:integration  # queries/lib tests against that database
npm run test:db:migrate   # applies the schema to the test database
npm run test:e2e          # real Next server + real HTTP
npm run test:db:down      # tears down and destroys the test database
```

## Deploy

Requires a host with a Node runtime for Next.js (Vercel, or anything other than pure static-file hosting) — the site serves real API routes (`/api/contact`, `/api/leads`, the whole CRM). Set the variables from `.env.example` in the hosting panel and run `npm run db:migrate` against the production database before the first deploy.

The Documents module (`/dashboard/proyectos/[id]`, `/portal`) stores uploaded files in Cloudflare R2, not on the container's filesystem — set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET_NAME` from `.env.example` (which documents how to create the bucket and API token).

Email notifications (proposal viewed, overdue invoice, SLA about to expire) require a separate Render Cron Job that periodically hits (e.g. hourly) `POST /api/cron/check-notifications` with the `x-cron-secret` header set to the `CRON_SECRET` variable, e.g.:

```
curl -f -X POST -H "x-cron-secret: $CRON_SECRET" https://your-domain.com/api/cron/check-notifications
```

Without `CRON_SECRET` configured, that route responds `503` and does nothing — notifications simply won't fire until the Cron Job is configured.
