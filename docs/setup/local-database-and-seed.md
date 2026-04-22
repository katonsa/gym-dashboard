# Local Database And Seed Data

Use this guide to start local Postgres, apply Prisma migrations, and load the
demo gym data used by the dashboard.

## Prerequisites

- Docker with Compose support.
- Node dependencies installed with `npm install`.
- A local `.env` file. Start from the checked-in template:

```bash
cp .env.example .env
```

The required local values are:

```bash
DATABASE_URL="postgresql://gymdashboard:gymdashboard@localhost:5432/gymdashboard?schema=public"
BETTER_AUTH_SECRET="replace-with-a-local-development-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

The `DATABASE_URL` above matches the default values in `compose.yaml`.
The Upstash Redis variables in `.env.example` are optional for local
development. Leave them blank to run without the shared dashboard cache.

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

## Provision An Owner

There are two supported local provisioning paths.

### Seeded Demo Data

For normal development with useful dashboard records, run:

```bash
npm run db:seed
```

Use the seeded owner credentials below to sign in.

The seed command runs Prisma's configured seed entrypoint:

```bash
npx tsx prisma/seed.ts
```

The seed script creates the demo owner account through Better Auth's
email/password API instead of inserting password records directly.

### First-Run Setup Wizard

For testing first-run provisioning, leave the database empty after migrations and
visit `/sign-in`. When no user exists, the sign-in page renders the setup wizard
instead of the sign-in form. The wizard creates the owner account and gym in one
flow.

If you previously seeded data and want to test this path again, reset the local
database first.

## Run DB-Backed Integration Tests

After Postgres is running and migrations are applied, run:

```bash
npm run test:integration
```

The integration runner loads `.env` before importing Prisma, creates isolated
owner/gym/member/payment fixtures, and deletes those fixtures after each test.
It covers server-action behavior for payment lifecycle, renewal lifecycle,
attendance lifecycle, member contact updates, and plan tier management.

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
- 35 members, which is enough to exercise roster pagination.
- Active, inactive, and suspended members.
- Monthly and annual memberships across all plans.
- Active, past-due, persisted-expired, de facto expired, and canceled membership
  states.
- Paid, pending, overdue, implicit-overdue, and void payment records.
- Recent, stale, null, and noted attendance states.
- Identified and anonymous drop-in visits, including more than one drop-in log
  page.
- Drop-in conversion scenarios for repeat visitors.

Useful seeded records:

| Record            | Scenario                                                                 |
| ----------------- | ------------------------------------------------------------------------ |
| `Putu Aditya`     | Active member with no plan; use for assigning a plan from member detail. |
| `Made Suryani`    | Persisted expired membership; use for the renewal flow.                  |
| `Yusuf Ramadhan`  | Active membership with a past period end and pending overdue payment.    |
| `Maya Putri`      | Past-due membership with an explicit overdue payment.                    |
| `Dewi Lestari`    | Annual membership expiring within the renewal window.                    |
| `Lina Kusuma`     | Monthly membership expiring within the renewal window.                   |
| `Fitri Handayani` | More than 25 payments; use for payment history pagination.               |
| `Hana Permata`    | More than 20 check-ins; use for attendance pagination.                   |
| `Citra Ningrum`   | Missing email, phone, and notes; use for contact-edit display states.    |
| `Tono Irawan`     | Inactive member with no attendance recorded.                             |
| `Bagus Wibowo`    | Multiple membership history rows for plan-change history display.        |
| `Nora Wati`       | Today's drop-in and a conversion lead.                                   |
| `Fajar Nugroho`   | Repeat drop-in visitor at the conversion threshold.                      |
| `Samuel Tan`      | Identified drop-in visitor below the conversion threshold.               |

The seed uses relative dates so alerts remain useful over time. Names, ids, and
exact dates do not need to match tests or documentation examples.

## Reset Local Data Safely

To reset the local database, reapply migrations, and rerun the seed:

```bash
npx prisma migrate reset
```

This command deletes local database data for the configured `DATABASE_URL`.
Confirm that `.env` points to your local Compose database before running it.

If you only want to stop Postgres without deleting the volume:

```bash
docker compose down
```

If you intentionally want to delete the Compose volume as well:

```bash
docker compose down --volumes
```
