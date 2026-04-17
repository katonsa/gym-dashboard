# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Auth & Account Provisioning

Owner accounts are **not** created through a public sign-up page. For local development, the seed script creates a demo owner:

| Field | Value |
|-------|-------|
| Email | `owner@jkt-strength.local` |
| Password | `owner-password-123` |

See [docs/03-auth-assumptions.md](docs/03-auth-assumptions.md) for full details on account provisioning, member records, and what is out of scope.

## Local Development

```bash
# Start Postgres
docker compose up -d

# Apply migrations
npx prisma migrate deploy

# Seed demo data
npm run db:seed

# Start dev server
npm run dev
```

To reset all data and re-seed:

```bash
npx prisma migrate reset
```

See [docs/04-local-database-and-seed.md](docs/04-local-database-and-seed.md) for the expected local `DATABASE_URL`, seed data coverage, and safe reset notes.
