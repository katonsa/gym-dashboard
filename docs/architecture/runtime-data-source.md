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

Several read paths now rely on performance-sensitive SQL and index choices:

- `/subscriptions` uses a set-based gym-local revenue trend query in
  `lib/dashboard/subscription-aggregates.ts` instead of a per-month loop.
- `/members` keeps the same substring search semantics while relying on
  Postgres trigram indexes plus supporting membership/payment indexes for the
  heavier roster filters.
- `/drop-ins` conversion-lead grouping uses a stored normalized visitor contact
  key instead of grouping by runtime `LOWER(visitorContact)`.

Some summary and lookup loaders can use the optional Upstash Redis cache before
falling back to Postgres. See `docs/architecture/redis-dashboard-cache.md` for
the cache key shape, stable `"current"` key behavior, TTL, and invalidation
rules.

Owner-scoped export routes also read runtime data directly from Postgres. The
monthly report export in `lib/dashboard/export-csv.ts` reuses the shared
subscription revenue-trend helper so exports and the `/subscriptions` page stay
aligned on gym-local month boundaries and overlap-based membership revenue.
This shared path also avoids reintroducing a second copy of the expensive
membership-overlap SQL logic.

## Runtime Writes

Owner/admin submissions include:

- Member actions through `app/(dashboard)/members/member-actions.ts`,
  `membership-actions.ts`, `payment-actions.server.ts`, and
  `import-actions.ts`.
- Drop-in entry through `app/(dashboard)/drop-ins/actions.ts`.
- Gym settings and plan tier changes through
  `app/(dashboard)/settings/actions.ts`.

Both server actions require the authenticated owner gym before writing records,
return structured action results, invalidate the gym-scoped Redis cache when it
is configured, and use `revalidatePath()` so the affected dashboard route reloads
fresh server data after mutation.

Drop-in writes also persist a conservative normalized contact key
(`trim().toLowerCase()`) so grouped conversion-lead queries can use indexed
stored values instead of runtime `LOWER(...)` grouping.

Route revalidation is based on downstream data dependencies, not only on the
page where the mutation starts. For example, member creation, payment
resolution, and drop-in creation also revalidate `/subscriptions` because the
subscription summary reads membership, payment, and drop-in revenue state.

Manual member entry also performs duplicate detection before writing. If a
possible duplicate exists in the same gym, the action returns duplicate matches
instead of creating records. A confirmed resubmission with
`confirmDuplicate: true` uses the same scoped write path.

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
`docs/setup/local-database-and-seed.md` for setup and reset commands.

## Related Handoff Docs

- `docs/architecture/auth-and-account-provisioning.md` documents auth assumptions, owner provisioning,
  and member account scope.
- `docs/architecture/redis-dashboard-cache.md` documents optional Upstash Redis
  caching, stable current-key behavior, and invalidation behavior.
- `docs/setup/local-database-and-seed.md` documents local Postgres setup, demo
  owner credentials, and seed coverage.
- `docs/archive/changes/runtime-performance-cleanup.md` documents the removed legacy
  full-load paths after pagination and aggregation landed.
