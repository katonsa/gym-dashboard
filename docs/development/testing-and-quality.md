# Testing And Quality

Use this guide when changing dashboard logic, server actions, Prisma queries, or
UI flows that depend on authenticated owner data.

## Test Commands

| Command                    | What it checks                                          | Requirements                                                               |
| -------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `npm test`                 | Unit tests via Vitest (single run).                     | Node dependencies installed.                                               |
| `npm run test:watch`       | Unit tests in watch mode — reruns on file changes.      | Node dependencies installed.                                               |
| `npm run test:integration` | Database-backed server action and lifecycle tests.      | Local Postgres running, migrations applied.                                |
| `npm run typecheck`        | TypeScript project correctness with `--noEmit`.         | Node dependencies installed.                                               |
| `npm run lint`             | ESLint rules, including Next.js checks.                 | Node dependencies installed.                                               |
| `npm run build`            | Production compilation and route validation.            | Valid environment variables and database access for build-time code paths. |

## Standard Verification

For a logic-only change, run:

```bash
npm test
npm run typecheck
npm run lint
```

For database writes, authenticated dashboard flows, or Prisma query changes, run:

```bash
docker compose up -d
npx prisma migrate deploy
npm test
npm run test:integration
npm run typecheck
npm run lint
```

For larger UI or routing changes, also run:

```bash
npm run build
```

## Unit-Style Tests

Fast tests live in `tests/*.test.ts` and are auto-discovered by Vitest via the
`include` glob in `vitest.config.ts`. They are best for pure logic and stable
contracts:

- Billing and renewal calculations.
- Dashboard mappers and formatters.
- Pagination helpers.
- Zod schemas.
- Owner scoping query shapes.
- Safe redirect and auth path helpers.

New test files matching `tests/*.test.ts` are picked up automatically by
`npm test` and `npm run test:watch`. No manual registration needed.

## Integration Tests

Integration tests live in `tests/*.integration.test.ts` and run via a separate
Vitest config (`vitest.config.integration.ts`). They should be used for behavior
that needs a real database:

- Server actions that create or update records.
- Payment lifecycle changes.
- Membership renewals and plan changes.
- Attendance and check-in lifecycle behavior.
- Owner-gym scoping for writes.

The integration config loads `.env` variables via Vite's `loadEnv` before Prisma
initializes, runs test files sequentially to avoid fixture collisions, and each
test creates isolated fixtures and deletes them after completion. Keep tests
deterministic and avoid depending on seeded demo records unless the test is
explicitly about seed coverage.

## Adding Coverage

Prefer the smallest test surface that proves the behavior:

- Put pure data rules in `lib/dashboard` and cover them with fast tests.
- Keep Prisma read ownership in query helpers or loaders and test the owner
  scoping contract.
- Use integration tests when the behavior depends on database constraints,
  transactions, or server action side effects.
- Test edge states that the UI depends on, such as empty results, expired
  memberships, overdue payments, and anonymous drop-ins.

## Manual Checks

After UI changes, run the app with seeded data and check these routes:

- `/` for overview cards, alerts, and revenue summaries.
- `/members` for roster search, pagination, member detail actions, and empty
  states.
- `/subscriptions` for plan distribution and revenue charts.
- `/drop-ins` for drop-in creation, log pagination, and conversion leads.
- `/settings` for gym settings and plan tier management.
- `/sign-in` with an empty database when changing first-run setup or auth page
  state.
