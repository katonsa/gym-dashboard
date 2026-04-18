# Runtime Data Source

Status: Active — applies to the database-backed dashboard milestone.

The dashboard routes use authenticated, owner-scoped database reads at runtime.
Mock dashboard data is no longer used as a runtime or test fixture.

## Runtime Reads

Dashboard pages load data through route-specific server loaders in
`lib/dashboard/loaders.ts`.

| Route            | Loader                                          | Primary records                                      |
| ---------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `/`              | `loadOverviewSummary()`, `loadOverviewAlerts()` | Gym, aggregate counts/sums, capped alert rows        |
| `/members`       | `loadMemberRosterPage()`                        | Gym, plans, paginated members with per-member counts |
| `/subscriptions` | `loadSubscriptionSummary()`                     | Gym, plans, aggregate subscription summary           |
| `/drop-ins`      | `loadDropInSummary()`, `loadDropInLogPage()`    | Gym, aggregate drop-in summary, paginated drop-ins   |

Each loader requires a dashboard session before reading gym data. The owner gym
is selected through `Gym.ownerId`, and all route data is scoped to that gym.
Membership queries scope through the owning member because `Membership` does not
have a direct `gymId` field.

The shared query shapes live in `lib/dashboard/query-scopes.ts`. They are tested
so future changes keep owner scoping intact.

## Runtime Writes

The current milestone supports two owner/admin submissions:

- Manual member entry through `app/(dashboard)/members/actions.ts`.
- Drop-in entry through `app/(dashboard)/drop-ins/actions.ts`.

Both server actions require the authenticated owner gym before writing records,
return `{ success: boolean, error?: string }`, and use `revalidatePath()` so the
affected dashboard route reloads fresh server data after mutation.

## Mapping Layer

Database rows are converted to dashboard types in `lib/dashboard/mappers.ts`.
This keeps the UI on stable dashboard types while Prisma models remain the
database contract. Date values are serialized to ISO strings before reaching
client components.

## Empty States

Runtime pages must not fall back to mocks when the database is empty,
unavailable, or unauthenticated. Instead:

- Unauthenticated users redirect to `/sign-in`.
- Authenticated users without an owner gym see the no-gym empty state.
- Empty database tables render route-specific empty states.

Use the seed data for local runtime verification. See
`docs/04-local-database-and-seed.md` for setup and reset commands.

## Related Handoff Docs

- `docs/03-auth-assumptions.md` documents auth assumptions, owner provisioning,
  and member account scope.
- `docs/04-local-database-and-seed.md` documents local Postgres setup, demo
  owner credentials, and seed coverage.
- `docs/09-runtime-performance-cleanup.md` documents the removed legacy
  full-load paths after pagination and aggregation landed.
