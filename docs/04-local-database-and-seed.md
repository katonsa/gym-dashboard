# Local Database And Seed Data

Use this guide to start a local Postgres database, apply the Prisma migrations, and load the demo gym data used by the dashboard.

## Prerequisites

- Docker with Compose support.
- Node dependencies installed with `npm install`.
- A local `.env` file with:

```bash
DATABASE_URL="postgresql://gymdashboard:gymdashboard@localhost:5432/gymdashboard"
BETTER_AUTH_SECRET="replace-with-a-local-development-secret"
```

The `DATABASE_URL` above matches the default values in `compose.yaml`.

## Start Postgres

```bash
docker compose up -d
```

The Compose service starts Postgres 17 and stores data in the `postgres-data` Docker volume. It uses these defaults unless overridden by environment variables:

| Variable            | Default        |
| ------------------- | -------------- |
| `POSTGRES_DB`       | `gymdashboard` |
| `POSTGRES_USER`     | `gymdashboard` |
| `POSTGRES_PASSWORD` | `gymdashboard` |
| `POSTGRES_PORT`     | `5432`         |

## Apply Migrations

For normal local setup:

```bash
npx prisma migrate deploy
```

For local schema development where you want Prisma to create or update development migrations:

```bash
npx prisma migrate dev
```

Both commands read `DATABASE_URL` from `.env` through `prisma.config.ts`.

## Seed Demo Data

```bash
npm run db:seed
```

The seed command runs Prisma's configured seed entrypoint:

```bash
npx tsx prisma/seed.ts
```

The seed script creates the demo owner account through Better Auth's email/password API instead of inserting password records directly.

## Run DB-Backed Integration Tests

After Postgres is running and migrations are applied, run:

```bash
npm run test:integration
```

The integration runner loads `.env` before importing Prisma, creates isolated
owner/gym/member/payment fixtures, and deletes those fixtures after each test.
It currently covers payment lifecycle mutations: marking payments paid, voiding
payments, owner-gym scoping, and `PAST_DUE` membership reactivation.

## Demo Owner Login

| Field    | Value                      |
| -------- | -------------------------- |
| Email    | `owner@jkt-strength.local` |
| Password | `owner-password-123`       |

These credentials are for local development only.

## Seed Data Coverage

The seed creates:

- One owner-owned gym: `JKT Strength House`.
- Basic, Pro, and Elite plan tiers.
- Active, inactive, and suspended members.
- Monthly and annual memberships.
- Active, past-due, expired, and canceled membership states.
- Paid, pending, overdue, and void payment records.
- Recent and stale attendance records.
- Identified and anonymous drop-in visits.
- Drop-in conversion scenarios for repeat visitors.

The data is scenario-compatible with the mock dashboard data, but names, ids, and dates do not need to match exactly.

## Reset Local Data Safely

To reset the local database, reapply migrations, and rerun the seed:

```bash
npx prisma migrate reset
```

This command deletes local database data for the configured `DATABASE_URL`. Confirm that `.env` points to your local Compose database before running it.

If you only want to stop Postgres without deleting the volume:

```bash
docker compose down
```

If you intentionally want to delete the Compose volume as well:

```bash
docker compose down --volumes
```
