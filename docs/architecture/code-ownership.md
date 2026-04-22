# Code Ownership Map

Status: Active — use this guide when deciding where new code belongs after the
domain refactor.

This repository no longer treats `lib/dashboard` as a general-purpose home for
business logic. The architecture is split so dashboard-only read models stay
under `lib/dashboard`, while reusable workflows and primitives live in
domain-specific folders.

## Fast Placement Rules

- Put route files and route-only UI wiring in `app/`.
- Put reusable UI in `components/`.
- Put auth-aware action helpers and route invalidation in `lib/application/`.
- Put reusable entity/value types, date parsing, mappers, and pagination in
  `lib/domain/`.
- Put reusable workflows in the matching domain folder under `lib/*`.
- Keep page-oriented aggregation and dashboard navigation in `lib/dashboard/`.
- Put CSV response builders and export helpers in `lib/reports/`.

If a file can be reused by non-dashboard entrypoints such as API routes,
background jobs, or future staff/member views, it should not live in
`lib/dashboard`.

## Folder Responsibilities

| Location                        | Owns                                                                 |
| ------------------------------- | -------------------------------------------------------------------- |
| `app/(dashboard)/*`             | Route modules, Server Action entrypoints, page wiring                |
| `components/*`                  | Shared UI, client components, presentation                           |
| `lib/application/*`             | Auth-aware action helpers, dashboard route hrefs, route revalidation |
| `lib/domain/*`                  | Shared types, date helpers, Prisma-to-domain mappers, pagination     |
| `lib/gyms/*`                    | Gym provisioning, settings, owner-gym lookup                         |
| `lib/plans/*`                   | Plan tier workflows and schemas                                      |
| `lib/members/*`                 | Member creation, status, contact, duplicate detection, import        |
| `lib/memberships/*`             | Membership calculations, renewals, plan changes                      |
| `lib/billing/*`                 | Billing periods and payment workflows                                |
| `lib/attendance/*`              | Check-in workflows and schemas                                       |
| `lib/drop-ins/*`                | Drop-in creation, visitor contact normalization, lookup              |
| `lib/reports/*`                 | CSV response helpers and owner-scoped export builders                |
| `lib/dashboard/loaders.ts`      | Route-facing dashboard data loading                                  |
| `lib/dashboard/navigation.ts`   | Dashboard labels, navigation models, shell metadata                  |
| `lib/dashboard/formatters.ts`   | Display-only formatting used by dashboard UI                         |
| `lib/dashboard/status-styles.ts` | Dashboard tone, badge, and risk presentation helpers                |
| `lib/dashboard/read-models/*`   | Page-oriented aggregation, query scopes, dashboard-only view models  |

## Import Boundaries

- Domain/application services should not import from `@/lib/dashboard`.
- `lib/dashboard/read-models/*` may depend on shared code in `lib/domain/*`.
- Server Actions should be thin wrappers over `lib/application/*` and
  domain-specific services, not the home of transaction logic.
- UI components should avoid importing database helpers directly.

Current intentional exception:

- `lib/reports/export-csv.ts` depends on dashboard read-model helpers so the
  monthly report export stays aligned with `/subscriptions` revenue math and
  gym-local month boundaries.

## Common Decisions

Put code in `lib/domain/*` when:

- it is a shared type or enum
- it parses or normalizes a reusable input shape
- it maps Prisma/database rows into domain values
- it is a pagination or date-boundary helper used across features

Put code in `lib/dashboard/read-models/*` when:

- it shapes data for a specific dashboard route
- it combines multiple domain tables for summary cards, alerts, charts, or
  roster rows
- it exists to support dashboard query performance or owner-scoped loader reads

Put code in a domain folder under `lib/*` when:

- it creates or mutates records for one business area
- it encapsulates duplicate detection, renewal, plan change, import, or similar
  workflows
- it should remain callable from another non-dashboard entrypoint later

## Testing Guidance

- Prefer fast tests for `lib/domain/*`, domain services under `lib/*`, and
  dashboard read-model helpers.
- Use integration tests for database-backed workflows, owner scoping, and
  transaction behavior.
- When adding a new helper, place the test beside the responsibility it serves,
  not the route that happens to call it first.

See [Testing And Quality](../development/testing-and-quality.md) for command
selection and verification expectations.
