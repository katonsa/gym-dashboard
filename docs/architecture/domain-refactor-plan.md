# Domain Refactor Plan

Status: Proposed. This plan prepares the dashboard codebase for a broader gym
management system without changing product behavior or database schema in the
first phase.

## Goal

The current app is a strong owner dashboard, but reusable business logic is
concentrated under `lib/dashboard`. That name is too narrow for the next product
stage. Members, memberships, billing, attendance, drop-ins, plan tiers, gym
settings, imports, and exports will need to be reused by staff views, member
portal flows, API routes, background jobs, and notifications.

This refactor separates:

- route/UI code in `app/` and `components/`
- dashboard read models in `lib/dashboard`
- reusable domain workflows in domain-specific `lib/*` folders
- cross-domain primitives in `lib/domain`
- authenticated action helpers in `lib/application`

## Non-Goals

- Do not redesign the UI.
- Do not change user-visible behavior.
- Do not change the Prisma schema in the first phase.
- Do not add staff roles, member accounts, scheduling, or payment provider
  integration during this refactor.
- Do not rewrite all loaders or actions at once.

## Target Folder Shape

```text
lib/
  application/
    dashboard-routes.ts
    owner-gym-action.ts
    revalidation.ts

  domain/
    date-boundaries.ts
    date-input.ts
    mappers.ts
    pagination.ts
    types.ts

  gyms/
    create-gym-action.ts
    owner-gym.ts
    settings-options.ts
    settings-service.ts
    schemas/

  plans/
    plan-tier-service.ts
    schemas/

  members/
    create-member-service.ts
    status-service.ts
    contact-service.ts
    duplicate-detection.ts
    import.ts
    import-service.ts
    schemas/

  memberships/
    calculations.ts
    plan-change-service.ts
    renewal-service.ts
    schemas/

  billing/
    periods.ts
    payment-service.ts
    schemas/

  attendance/
    check-in-service.ts
    schemas/

  drop-ins/
    create-visit-service.ts
    visitor-contact.ts
    visitor-lookup.ts
    schemas/

  reports/
    csv.ts
    export-csv.ts

  dashboard/
    navigation.ts
    loaders.ts
    formatters.ts
    status-styles.ts
    read-models/
```

## Exact File Moves

### Application Layer

```text
lib/dashboard/action-helpers.ts
-> lib/application/owner-gym-action.ts
```

Add route constants outside the dashboard namespace:

```text
lib/application/dashboard-routes.ts
```

This file should own the safe dashboard href union used by auth and routing
helpers. `lib/dashboard/navigation.ts` can import these hrefs and add
dashboard-specific labels/descriptions for the app shell.

Add later:

```text
lib/application/revalidation.ts
```

This should centralize common route revalidation groups such as member,
subscription, overview, drop-in, and settings invalidation.

### Shared Domain

```text
lib/dashboard/types.ts
-> split into:
   lib/domain/types.ts
   lib/application/dashboard-routes.ts
   lib/dashboard/navigation.ts
   lib/dashboard/read-models/types.ts

lib/dashboard/date-boundaries.ts
-> lib/domain/date-boundaries.ts

lib/dashboard/formatters.ts
-> split into:
   lib/domain/date-input.ts
   lib/dashboard/formatters.ts

lib/dashboard/mappers.ts
-> lib/domain/mappers.ts

lib/dashboard/pagination.ts
-> lib/domain/pagination.ts
```

`lib/domain/types.ts` should contain reusable entity and value types:

- `BillingInterval`
- `MemberStatus`
- `MembershipStatus`
- `PaymentStatus`
- `AttendanceSource`
- `CurrencyCode`
- `DateString`
- `GymProfile`
- `PlanTier`
- `Member`
- `Membership`
- `MembershipPayment`
- `AttendanceRecord`
- `DropInVisit`

`lib/application/dashboard-routes.ts` should contain:

- `dashboardRouteHrefs`
- `DashboardRouteHref`

`lib/dashboard/navigation.ts` should contain:

- `dashboardRoutes`
- `DashboardRoute`
- `DashboardNavigationModel`
- `dashboardNavigationModel`

It may import `DashboardRouteHref` from `lib/application/dashboard-routes.ts`,
but auth modules should not import from `lib/dashboard`.

`lib/domain/date-input.ts` should contain non-UI date input helpers such as
`parseDateInput`. `lib/dashboard/formatters.ts` should retain display-only
formatting helpers.

`lib/domain/mappers.ts` should contain Prisma-to-domain mappers such as
`mapPlanTier`, `mapGymProfile`, `mapMember`, `mapMembership`,
`mapMembershipPayment`, `mapAttendanceRecord`, and `mapDropInVisit`. Dashboard
view-specific row/card assembly should stay in dashboard read models.

`lib/dashboard/read-models/types.ts` should contain dashboard-only reporting
types:

- `DashboardAlert`
- `DashboardAlertSeverity`
- `DashboardSummary`
- aggregate result/view-model types that are not reusable domain entities

### Gyms

```text
lib/dashboard/owner-gym.ts
-> lib/gyms/owner-gym.ts

lib/dashboard/gym-create-action.ts
-> lib/gyms/create-gym-action.ts

lib/dashboard/gym-settings-options.ts
-> lib/gyms/settings-options.ts

lib/dashboard/schemas/gym-create-schema.ts
-> lib/gyms/schemas/create-gym-schema.ts

lib/dashboard/schemas/gym-settings-schema.ts
-> lib/gyms/schemas/settings-schema.ts
```

Extract after moving:

```text
lib/gyms/settings-service.ts
```

This service should own the actual gym settings update currently embedded in
`app/(dashboard)/settings/actions.ts`.

`createGym` is intentionally allowed to remain a lib-level Server Action after
the move because the first-run setup wizard is an auth flow rather than a
dashboard route. The important boundary is that it no longer lives under the
dashboard namespace.

### Plans

```text
lib/dashboard/plan-tier-management.ts
-> lib/plans/plan-tier-service.ts

lib/dashboard/schemas/plan-tier-schema.ts
-> lib/plans/schemas/plan-tier-schema.ts
```

### Members

```text
lib/dashboard/member-contact-lifecycle.ts
-> lib/members/contact-service.ts

lib/dashboard/member-duplicate-detection.ts
-> lib/members/duplicate-detection.ts

lib/dashboard/member-import.ts
-> lib/members/import.ts

lib/dashboard/schemas/member-create-schema.ts
-> lib/members/schemas/create-member-schema.ts

lib/dashboard/schemas/update-member-contact-schema.ts
-> lib/members/schemas/update-contact-schema.ts
```

Extract after moving:

```text
lib/members/create-member-service.ts
lib/members/status-service.ts
lib/members/import-service.ts
```

These services should own the member creation transaction and member status
transition currently embedded in `app/(dashboard)/members/member-actions.ts`,
plus the import preview/confirmation orchestration currently embedded in
`app/(dashboard)/members/import-actions.ts`.

### Memberships

```text
lib/dashboard/calculations.ts
-> lib/memberships/calculations.ts

lib/dashboard/renewal-lifecycle.ts
-> lib/memberships/renewal-service.ts

lib/dashboard/schemas/change-plan-schema.ts
-> lib/memberships/schemas/change-plan-schema.ts

lib/dashboard/schemas/renew-membership-schema.ts
-> lib/memberships/schemas/renew-membership-schema.ts
```

Extract after moving:

```text
lib/memberships/plan-change-service.ts
```

This service should own the plan change transaction currently embedded in
`app/(dashboard)/members/membership-actions.ts`.

### Billing

```text
lib/dashboard/billing.ts
-> lib/billing/periods.ts

lib/dashboard/payment-lifecycle.ts
-> lib/billing/payment-service.ts

lib/dashboard/schemas/mark-paid-schema.ts
-> lib/billing/schemas/mark-paid-schema.ts

lib/dashboard/schemas/void-payment-schema.ts
-> lib/billing/schemas/void-payment-schema.ts
```

### Attendance

```text
lib/dashboard/attendance-lifecycle.ts
-> lib/attendance/check-in-service.ts

lib/dashboard/schemas/log-checkin-schema.ts
-> lib/attendance/schemas/log-checkin-schema.ts
```

### Drop-Ins

```text
lib/dashboard/drop-in-visitor-lookup.ts
-> lib/drop-ins/visitor-lookup.ts

lib/dashboard/schemas/drop-in-create-schema.ts
-> lib/drop-ins/schemas/create-drop-in-schema.ts
```

Extract after moving:

```text
lib/drop-ins/create-visit-service.ts
lib/drop-ins/visitor-contact.ts
```

`visitor-contact.ts` should own `normalizeDropInVisitorContact`, which currently
lives in `lib/dashboard/drop-in-aggregates.ts`.

### Reports

```text
lib/dashboard/csv.ts
-> lib/reports/csv.ts

lib/dashboard/export-csv.ts
-> lib/reports/export-csv.ts
```

### Dashboard Read Models

```text
lib/dashboard/aggregate-queries.ts
-> lib/dashboard/read-models/aggregate-queries.ts

lib/dashboard/aggregate-types.ts
-> lib/dashboard/read-models/aggregate-types.ts

lib/dashboard/aggregates.ts
-> lib/dashboard/read-models/aggregates.ts

lib/dashboard/subscription-aggregates.ts
-> lib/dashboard/read-models/subscription-aggregates.ts

lib/dashboard/drop-in-aggregates.ts
-> lib/dashboard/read-models/drop-in-aggregates.ts

lib/dashboard/member-roster.ts
-> lib/dashboard/read-models/member-roster.ts

lib/dashboard/query-scopes.ts
-> lib/dashboard/read-models/query-scopes.ts

lib/dashboard/cache-params.ts
-> lib/dashboard/read-models/cache-params.ts
```

These files remain dashboard-owned because they assemble page summaries,
alerts, filters, charts, and other dashboard-specific read models.

## Server Action Boundaries

Route action files should remain in `app/` because client components import
Server Actions from `"use server"` files. They should become thin wrappers.

Each action should do only:

1. Validate input.
2. Resolve authenticated gym context.
3. Call a domain service.
4. Invalidate cache and revalidate affected routes.
5. Return UI-friendly action results.

### Keep These Server Action Files

```text
app/(dashboard)/members/member-actions.ts
app/(dashboard)/members/membership-actions.ts
app/(dashboard)/members/payment-actions.server.ts
app/(dashboard)/members/import-actions.ts
app/(dashboard)/drop-ins/actions.ts
app/(dashboard)/settings/actions.ts
```

Do not move these into `lib/` until there is a clear need. The current route
colocation is compatible with Next.js App Router and keeps UI entry points easy
to trace.

## Migration Sequence

Shell note:

- Quote any path or search pattern you paste into the shell if it contains route
  groups or glob-sensitive characters. In `zsh`, paths like
  `"app/(dashboard)/members/page.tsx"` and patterns like `'@/lib/dashboard'`
  should be quoted to avoid shell expansion errors.
- Prefer single quotes for copied `rg` patterns. In `zsh`, backticks inside
  double-quoted patterns are treated as command substitution, which can cause
  errors such as `command not found` for text that was meant to be searched
  literally.

### Step 0: Baseline

Run and record:

```bash
npm test
npm run typecheck
npm run lint
```

If database-backed work is already in progress, also run:

```bash
npm run test:integration
```

### Step 1: Add New Folder Structure

Create the target folders without moving behavior.

Expected result:

- no import changes yet
- no behavior changes
- no tests should fail

Verification:

```bash
npm run typecheck
```

### Step 2: Move Pure Utilities With Compatibility Shims

Move:

- `billing.ts`
- `calculations.ts`
- `date-boundaries.ts`
- non-UI date parsing from `formatters.ts` into `domain/date-input.ts`
- `mappers.ts`
- `pagination.ts`
- `csv.ts`
- `export-csv.ts`

For each old path, leave a temporary re-export file:

```ts
export * from "@/lib/new/path"
```

Verification:

```bash
npm test
npm run typecheck
npm run lint
```

### Step 3: Move Schemas

Move all schema files into the relevant domain folders. Leave compatibility
re-export files at old paths until imports have been migrated.

Verification:

```bash
npm test
npm run typecheck
npm run lint
```

### Step 4: Move Existing Domain Services

Move lifecycle and helper services:

- payment lifecycle
- renewal lifecycle
- attendance lifecycle
- member contact lifecycle
- duplicate detection
- member import
- plan tier management
- owner gym
- drop-in visitor lookup

Keep re-export shims until imports are migrated.

Verification:

```bash
npm test
npm run typecheck
npm run lint
```

### Step 5: Move Dashboard Read Models

Move aggregate, query, roster, and cache-param files under
`lib/dashboard/read-models`.

Update `lib/dashboard/loaders.ts` first because it is the main read-model
consumer.

Verification:

```bash
npm test
npm run typecheck
npm run lint
```

### Step 6: Split `types.ts`

Move shared entity types to `lib/domain/types.ts`.

Move safe dashboard route hrefs to `lib/application/dashboard-routes.ts`.

Move dashboard navigation labels/descriptions to `lib/dashboard/navigation.ts`.

Move dashboard-only reporting/read-model types to
`lib/dashboard/read-models/types.ts`.

Keep `lib/dashboard/index.ts` only as a temporary compatibility barrel during
the migration. It must be deleted in Step 9 instead of surviving as a public
import surface.

Verification:

```bash
npm test
npm run typecheck
npm run lint
```

### Step 7: Extract Inline Server Action Workflows

Extract business workflows out of Server Action files.

Create:

```text
lib/members/create-member-service.ts
lib/members/status-service.ts
lib/members/import-service.ts
lib/memberships/plan-change-service.ts
lib/drop-ins/create-visit-service.ts
lib/drop-ins/visitor-contact.ts
lib/gyms/settings-service.ts
```

After extraction, action files should contain no Prisma transaction logic except
where the action itself is intentionally just an orchestration boundary.

Verification:

```bash
npm test
npm run test:integration
npm run typecheck
npm run lint
```

### Step 8: Migrate Imports Away From Old Paths

Use `rg '@/lib/dashboard'` to find imports that should now point to domain
folders.

Allowed remaining `@/lib/dashboard` imports:

- route navigation
- loaders
- formatters
- status styles
- dashboard read models

Not allowed after this step:

- billing imports from `@/lib/dashboard`
- member service imports from `@/lib/dashboard`
- member import workflow imports from `@/lib/dashboard`
- membership service imports from `@/lib/dashboard`
- attendance imports from `@/lib/dashboard`
- drop-in service imports from `@/lib/dashboard`
- plan service imports from `@/lib/dashboard`
- gym service imports from `@/lib/dashboard`
- non-UI date parsing imports from `@/lib/dashboard`
- Prisma-to-domain mapper imports from `@/lib/dashboard`

Verification:

```bash
npm test
npm run test:integration
npm run typecheck
npm run lint
```

### Step 9: Remove Compatibility Shims

Delete old re-export files under `lib/dashboard` after all imports are moved.

Keep only dashboard-owned files:

```text
lib/dashboard/loaders.ts
lib/dashboard/formatters.ts
lib/dashboard/status-styles.ts
lib/dashboard/navigation.ts
lib/dashboard/read-models/*
```

Delete `lib/dashboard/index.ts` after all imports are explicit. The final
architecture should not provide a dashboard barrel that re-exports domain APIs.

Verification:

```bash
npm test
npm run test:integration
npm run typecheck
npm run lint
npm run build
```

### Step 10: Update Documentation

Update:

- `README.md`
- `docs/README.md`
- `docs/architecture/runtime-data-source.md`
- feature docs that reference old file paths

Move this document to `docs/archive/plans/` only after the refactor is complete.

## Completion Criteria

The refactor is complete when:

- `lib/dashboard` contains only dashboard UI/read-model concerns.
- Domain workflows live in domain folders.
- Domain workflows do not import from `@/lib/dashboard`.
- Server Actions are thin wrappers around domain services.
- `lib/dashboard/index.ts` has been removed.
- All tests, typecheck, lint, integration tests, and build pass.
- Feature docs point to the new file paths.
- No runtime behavior changed.
