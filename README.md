# Gym Dashboard

A mobile-first gym owner dashboard for tracking members, memberships, payments,
drop-ins, and renewal risk. The app is built with Next.js 16, React Server
Components, Prisma, Postgres, Better Auth, Tailwind CSS, and shadcn-style UI
primitives.

The current product target is a single-location gym with fewer than 200 members.
Owner accounts can be created through the first-run setup wizard or by seeding
local demo data.

## What The App Does

- Shows owner-scoped overview metrics, renewal alerts, revenue, and attendance
  risk.
- Manages members, memberships, check-ins, payments, contact details, and plan
  changes.
- Tracks drop-in visits and highlights repeat visitors as conversion leads.
- Manages gym settings, default drop-in fees, and membership plan tiers.
- Uses database-backed runtime data. Mock dashboard data is retained only for
  tests and legacy references.

## Tech Stack

| Area   | Tools                                                           |
| ------ | --------------------------------------------------------------- |
| App    | Next.js 16 App Router, React 19, TypeScript                     |
| UI     | Tailwind CSS 4, shadcn-style components, Radix UI, lucide-react |
| Data   | PostgreSQL, Prisma 7, optional Upstash Redis cache              |
| Auth   | Better Auth email/password                                      |
| Charts | Recharts                                                        |
| Tests  | Node's TypeScript strip-types runner plus focused test modules  |

## Quick Start

Install dependencies:

```bash
npm install
```

Create `.env` from the example:

```bash
cp .env.example .env
```

Start the local database, apply migrations, and seed demo data:

```bash
docker compose up -d
npx prisma migrate deploy
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

Seeded owner login:

| Field    | Value                      |
| -------- | -------------------------- |
| Email    | `owner@jkt-strength.local` |
| Password | `owner-password-123`       |

For an empty database, visit `/sign-in`; the app shows the first-run setup
wizard and creates the owner account plus gym in one flow.

## Common Commands

| Command                    | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `npm run dev`              | Start the Next.js dev server with Turbopack.           |
| `npm run build`            | Create a production build.                             |
| `npm run start`            | Serve the production build.                            |
| `npm run lint`             | Run ESLint.                                            |
| `npm run typecheck`        | Run TypeScript with `--noEmit`.                        |
| `npm test`                 | Run fast unit-style TypeScript tests.                  |
| `npm run test:integration` | Run database-backed integration tests.                 |
| `npm run db:seed`          | Seed the local demo owner, gym, members, and payments. |
| `npm run format`           | Format TypeScript and TSX files with Prettier.         |

Integration tests require Postgres to be running and migrated.

## Optional Redis Cache

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env` to enable
the shared dashboard cache. When those variables are absent, reads go directly
to Postgres. The cache stores owner-scoped dashboard summaries and lookup data
with a short TTL, and server actions invalidate the gym's cache version after
mutations.

## Project Layout

```text
app/
  (auth)/             Sign-in, first-run setup, auth states
  (dashboard)/        Overview, members, subscriptions, drop-ins, settings
  api/                Route handlers
components/           Shared UI and app components
components/ui/        shadcn-style primitives
docs/                 Product, setup, architecture, feature, and archive docs
lib/
  auth/               Better Auth setup, sessions, page-state helpers
  dashboard/          Loaders, mappers, schemas, calculations, mutations
prisma/               Schema, migrations, seed data
tests/                Custom TypeScript test modules and runners
```

## Documentation

Start with the organized documentation index:

- [Documentation Index](docs/README.md)
- [Project Brief](docs/product/project-brief.md)
- [Local Database And Seed Data](docs/setup/local-database-and-seed.md)
- [Auth & Account Provisioning](docs/architecture/auth-and-account-provisioning.md)
- [Runtime Data Source](docs/architecture/runtime-data-source.md)
- [Testing And Quality](docs/development/testing-and-quality.md)

Archived plans and completed change notes are kept under `docs/archive/` for
historical context.

## Development Notes

- Prefer React Server Components. Add client components only for browser APIs,
  state, or event handlers.
- Runtime dashboard reads should go through authenticated, owner-scoped loaders
  in `lib/dashboard/loaders.ts`.
- Keep Prisma-to-UI conversion in the dashboard mapper layer.
- Add focused tests for pure logic in `lib/dashboard` and integration tests for
  server actions that change database state.
- Do not commit real secrets. Use `.env.example` as the local configuration
  template.
