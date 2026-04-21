# Codebase Refactoring Plan

> **Scope**: Structural refactoring — zero behavior change.
> **Goal**: Eliminate duplication, relocate misplaced modules, decompose
> oversized files, and improve developer velocity for the next feature cycle.

---

## Current State

The codebase has ~12K lines across 96 source files (excluding generated Prisma
client). Development has been feature-driven over several iterations, producing
a working product but accumulating structural debt:

- **Formatter functions** are duplicated 20+ times across files (`titleCase` ×5,
  `formatDate` ×7, `parseDateInput` ×2, `formatDateInput` ×3,
  `formatCurrency` ×3, `formatMemberName` ×2).
- **Tailwind class maps** for badges and status indicators are copy-pasted in 3+
  files.
- **Presentational components** (`StatusBadge`, `RiskBadge`, `DetailField`,
  `EmptyState`) are redeclared as private functions in every page.
- **Business-logic modules** (payment, renewal, attendance, contact lifecycles)
  live inside `app/(dashboard)/members/` with `../../../lib` relative imports.
- **Validation schemas** (7 Zod schema files) live in the route folder instead
  of the domain layer.
- **Server actions** are consolidated in a single 772-line file with ~30 lines of
  boilerplate repeated per action.
- **`aggregates.ts`** is 1186 lines mixing types, queries, SQL, date math, and
  orchestration.
- **Page files** range from 442 to 714 lines with many inline private
  components.

---

## Phasing Strategy

The refactoring is split into **4 phases** ordered by dependency:

```
Phase 1 (Foundation)     → shared formatters, style maps, components
Phase 2 (Domain Layer)   → lifecycle modules, schemas to lib/
Phase 3 (Server Actions) → action boilerplate, split by domain
Phase 4 (UI Decomposition) → page splitting, aggregates splitting
```

Each phase is **independently shippable** and verified before the next begins.
Phases can be committed individually as clean, reviewable pull requests.

---

## Phase 1 — Foundation Layer

**Goal**: Create the shared modules that all subsequent phases depend on.

**Estimated scope**: ~8 new files, ~20 files updated (import changes only).

### 1A. Shared Formatters — `lib/dashboard/formatters.ts`

Create a single module consolidating all duplicated formatting functions:

| Function                    | Copies today | Source files                                                            |
| --------------------------- | ------------ | ----------------------------------------------------------------------- |
| `titleCase`                 | 5            | roster, detail page, plan-change form, create form, renewal action      |
| `formatDate`                | 7            | aggregates, detail page, renewal action, plan-change form, checkin form |
| `formatDateInput`           | 3            | detail page, members page, checkin schema                               |
| `formatCurrency`            | 3            | aggregates, detail page, overview page                                  |
| `formatMemberName`          | 2            | aggregates, detail page                                                 |
| `parseDateInput`            | 2            | create schema, renewal action (identical copy)                          |
| `formatDashboardDate`       | 2            | overview page, drop-ins page                                            |
| `formatPageRange`           | 2            | detail page, drop-ins page                                              |
| `formatBillingInterval`     | 1            | detail page                                                             |
| `formatAttendanceSource`    | 1            | detail page                                                             |
| `formatMembershipStatus`    | 1            | roster                                                                  |
| `formatDateInputForDisplay` | 1            | renewal action                                                          |

**Note on `titleCase` variant**: The renewal action splits on `_`, while others
split on ` `. The unified version handles both: split on `[_ ]`, lowercase,
capitalize first letter.

After this step:

- Delete all private `titleCase`, `formatDate`, `formatCurrency`,
  `formatMemberName`, `formatDateInput`, `parseDateInput`,
  `formatDashboardDate`, `formatBillingInterval`, `formatAttendanceSource`,
  `formatMembershipStatus`, `formatPageRange`, and
  `formatDateInputForDisplay` from their current locations.
- Update all imports to use `@/lib/dashboard/formatters`.

### 1B. Shared Status Styles — `lib/dashboard/status-styles.ts`

Extract all duplicated Tailwind class record maps:

| Map                                                  | Files today                  |
| ---------------------------------------------------- | ---------------------------- |
| `statusClasses` (MemberStatus)                       | roster, detail page          |
| `riskClasses` (BillingRisk)                          | roster, detail page          |
| `membershipClasses` (MembershipStatus)               | detail page                  |
| `membershipDisplayClasses` (MembershipDisplayStatus) | detail page                  |
| `paymentClasses` (PaymentStatus)                     | detail page                  |
| `toneClasses` (stat tone)                            | overview page, drop-ins page |
| `severityClasses` (DashboardAlertSeverity)           | overview page                |

Also export the `BillingRisk` type (currently defined separately in
`member-roster.ts` and `[id]/page.tsx`).

### 1C. Shared Badge Components — `components/dashboard/badges.tsx`

Deduplicate 5 badge components into a single file using the style maps from 1B:

- `StatusBadge` — member status (ACTIVE, INACTIVE, SUSPENDED)
- `RiskBadge` — billing risk (clear, expired, expiring, overdue)
- `MembershipBadge` — membership status
- `MembershipDisplayBadge` — computed display status
- `PaymentBadge` — payment status

All follow the same pattern: `<span>` with conditional border/bg/text classes
from the style map.

### 1D. Shared Card Components

Create three small component files:

**`components/dashboard/detail-field.tsx`** — Unify `DetailField` (2 identical
copies in detail page + contact card), `MemberField` (roster), `DropInField`
(drop-ins page). All follow the same pattern: uppercase label + value.

**`components/dashboard/info-card.tsx`** — Extract the `InfoCard` component
from the member detail page (section wrapper with title, optional detail,
optional action slot). Also extract `EmptyText`.

**`components/dashboard/empty-state.tsx`** — Unify `OverviewEmptyState`,
`MemberRosterEmptyState`, `DropInsEmptyState` into one `EmptyState` with
optional action (label + href) props.

### Phase 1 Verification

```bash
npm run typecheck   # Zero errors
npm run lint        # Zero errors
npm test            # All tests pass (formatters + styles are pure data)
npm run build       # Production build succeeds
```

Visual spot-check: all 4 dashboard pages render identically.

---

## Phase 2 — Domain Layer Relocation

**Goal**: Move business-logic modules and validation schemas out of route
folders into `lib/dashboard/`, removing `../../../lib` relative imports.

**Estimated scope**: ~11 files moved, ~15 files updated (import changes only).

### 2A. Lifecycle Modules → `lib/dashboard/`

Move these four pure-logic modules:

| Current location                                      | New location                                |
| ----------------------------------------------------- | ------------------------------------------- |
| `app/(dashboard)/members/payment-lifecycle.ts`        | `lib/dashboard/payment-lifecycle.ts`        |
| `app/(dashboard)/members/renewal-lifecycle.ts`        | `lib/dashboard/renewal-lifecycle.ts`        |
| `app/(dashboard)/members/attendance-lifecycle.ts`     | `lib/dashboard/attendance-lifecycle.ts`     |
| `app/(dashboard)/members/member-contact-lifecycle.ts` | `lib/dashboard/member-contact-lifecycle.ts` |

These modules already use injected `PrismaClient` interfaces — no Next.js or
route-layer dependencies. Moving them:

- Converts `../../../lib/dashboard/billing.ts` → `./billing.ts`
- Converts `../../../lib/generated/prisma/client.ts` → `@/lib/generated/prisma/client`
- Makes `@/lib/dashboard` the canonical import path for consumers

Update imports in:

- `app/(dashboard)/members/actions.ts`
- `tests/payment-lifecycle-actions.integration.test.ts`
- `tests/renewal-lifecycle-actions.integration.test.ts`
- `tests/attendance-lifecycle-actions.integration.test.ts`
- `tests/member-contact-lifecycle-actions.integration.test.ts`

### 2B. Validation Schemas → `lib/dashboard/schemas/`

Create `lib/dashboard/schemas/` and move the route-local Zod schema files:

| Current location                          | New location                                            |
| ----------------------------------------- | ------------------------------------------------------- |
| `members/member-create-schema.ts`         | `lib/dashboard/schemas/member-create-schema.ts`         |
| `members/change-plan-schema.ts`           | `lib/dashboard/schemas/change-plan-schema.ts`           |
| `members/log-checkin-schema.ts`           | `lib/dashboard/schemas/log-checkin-schema.ts`           |
| `members/mark-paid-schema.ts`             | `lib/dashboard/schemas/mark-paid-schema.ts`             |
| `members/void-payment-schema.ts`          | `lib/dashboard/schemas/void-payment-schema.ts`          |
| `members/renew-membership-schema.ts`      | `lib/dashboard/schemas/renew-membership-schema.ts`      |
| `members/update-member-contact-schema.ts` | `lib/dashboard/schemas/update-member-contact-schema.ts` |
| `drop-ins/drop-in-create-schema.ts`       | `lib/dashboard/schemas/drop-in-create-schema.ts`        |

**Important**: `parseDateInput` was exported from `member-create-schema.ts` and
imported by lifecycle modules + other schemas. After Phase 1A, it lives in
`formatters.ts`, so the schema file only needs to import it from there.

Update imports in:

- All server action files
- All form components that import schemas
- All test files under `tests/` that import schemas
- `renewal-lifecycle.ts` (for `parseDateInput`)

### Phase 2 Verification

```bash
npm run typecheck
npm run lint
npm test            # Integration tests must still pass
npm run build
```

---

## Phase 3 — Server Action Layer

**Goal**: Eliminate per-action boilerplate and split the 772-line monolith into
focused, domain-specific files.

**Estimated scope**: 4 new files, 1 deleted, ~10 files updated.

### 3A. Action Helper — `lib/dashboard/action-helpers.ts`

Create a `withGymAction` wrapper that handles the repeated pattern in every
server action:

```ts
// Current pattern (repeated 7 times, ~30 lines each):
const session = await requireDashboardSession("/members")
const parsed = someSchema.safeParse(values)
if (!parsed.success) {
  return { success: false, error: parsed.error.issues[0]?.message ?? "..." }
}
const gym = await db.gym.findFirst({
  where: { ownerId: session.user.id },
  select: { id: true },
  orderBy: { createdAt: "asc" },
})
if (!gym) {
  return { success: false, error: "Connect a gym..." }
}

// After withGymAction (~5 lines of setup):
return withGymAction({
  schema: someSchema,
  values,
  redirectPath: "/members",
  handler: async ({ parsed, gymId }) => {
    /* business logic only */
  },
})
```

The helper returns a typed `ActionResult` and catches errors uniformly.

### 3B. Split `actions.ts` into Domain Files

| New file                    | Actions                                                                         | Imports from UI                                        |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `member-actions.ts`         | `createMember`, `updateMemberStatus`, `updateMemberContact`, `logMemberCheckIn` | create form, status action, contact card, checkin form |
| `membership-actions.ts`     | `changeMemberPlan`, `renewMembership`                                           | plan-change form, renewal action, overview renewal     |
| `payment-actions.server.ts` | `markPaymentPaid`, `voidPayment`                                                | payment-actions.tsx                                    |

All files start with `"use server"`. The shared `ActionResult` type moves to
`action-helpers.ts`.

### 3C. Delete `actions.ts`

After all consumers are updated, delete the original monolith.

Update imports in:

- `member-create-form.tsx` → `./member-actions`
- `member-status-action.tsx` → `./member-actions`
- `member-contact-card.tsx` → `./member-actions`
- `member-checkin-form.tsx` → `./member-actions`
- `member-quick-checkin-action.tsx` → `./member-actions`
- `member-plan-change-form.tsx` → `./membership-actions`
- `member-renewal-action.tsx` → `./membership-actions`
- `overview-renewal-action.tsx` → `./membership-actions`
- `payment-actions.tsx` → `./payment-actions.server`

### Phase 3 Verification

```bash
npm run typecheck
npm run lint
npm test            # All action-related tests pass
npm run build
```

Functional spot-check: create a member, renew, mark paid, void, check-in,
edit contact, change plan.

---

## Phase 4 — UI Decomposition

**Goal**: Break oversized page files and the aggregates module into focused
sub-modules.

**Estimated scope**: ~15 new files, 4 files significantly reduced.

**Implementation note**: The final aggregate split keeps `aggregates.ts` as the
public overview orchestration and compatibility re-export file. Base query/date
helpers, exported types, subscription aggregates, and drop-in aggregates now live
in separate focused modules.

### 4A. Split `aggregates.ts` (1186 lines)

| New file                     | Contents                                                                                                                                                                                                                                | ~Lines |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `aggregate-types.ts`         | `DashboardDb`, all raw-row types, result types, option types                                                                                                                                                                            | ~200   |
| `aggregate-queries.ts`       | `getMemberCountsByStatus`, `getNewSignUpsThisMonth`, `getMembershipMrr`, `getDropInRevenue`, `getExpiringMembershipsCount`, `getExpiredMembershipsCount`, `getOverduePaymentsCount`, `getInactiveMembersCount`, `getOverviewSetupState` | ~300   |
| `subscription-aggregates.ts` | `getSubscriptionSummary`, `getPlanBreakdownAggregates`, `getRevenueTrend`                                                                                                                                                               | ~200   |
| `drop-in-aggregates.ts`      | `getDropInSummary`, `getConversionLeads`, `getConversionLeadsCount`, `getDropInTotal`                                                                                                                                                   | ~150   |
| `aggregates.ts` (kept)       | `getOverviewSummary`, `getOverviewAlerts`, `getOverdueAgingSummary`, date-range helpers, re-exports                                                                                                                                     | ~200   |

Remove private `formatDate`, `formatCurrency`, `formatMemberName` (use
`@/lib/dashboard/formatters` from Phase 1).

### 4B. Split Member Detail Page (`[id]/page.tsx`, 714 lines)

| New file                                 | Contents                                                 |
| ---------------------------------------- | -------------------------------------------------------- |
| `[id]/page.tsx`                          | Page shell, data loading, layout, imports (~120 lines)   |
| `members/current-membership-summary.tsx` | `CurrentMembershipSummary` with renewal and edit actions |
| `members/membership-history-item.tsx`    | `MembershipHistoryItem` row component                    |
| `members/payment-history-item.tsx`       | `PaymentHistoryItem` with inline `PaymentActions`        |
| `members/attendance-log-item.tsx`        | `AttendanceLogItem` row component                        |

Move `getBillingRisk` and `getMembershipPeriodDetail` into the page shell (they
use page-level data).

### 4C. Split Overview Page (`page.tsx`, 505 lines)

| New file                     | Contents                                                         |
| ---------------------------- | ---------------------------------------------------------------- |
| `page.tsx`                   | Page shell, data loading, summary stat data, layout (~150 lines) |
| `overview-stats-section.tsx` | Stats grid with tone classes (server component)                  |
| `overview-pinned-alerts.tsx` | `PinnedAlertCard` + alert routing logic (server component)       |

Move `getAlertHref` into `overview-pinned-alerts.tsx`.

### 4D. Split Drop-ins Page (`drop-ins/page.tsx`, 442 lines)

| New file                       | Contents                                            |
| ------------------------------ | --------------------------------------------------- |
| `drop-ins/page.tsx`            | Shell, data loading, layout (~100 lines)            |
| `drop-ins/drop-in-summary.tsx` | Summary stats + frequent visitors section           |
| `drop-ins/drop-in-log.tsx`     | Table + card views, row formatting, `getDropInRows` |

### Phase 4 Verification

```bash
npm run typecheck
npm run lint
npm test            # Aggregate tests must still pass
npm run build
```

Visual spot-check all 4 dashboard pages. Verify pagination, actions, and theme
toggle.

---

## Recommended Execution Order

| Order | Phase                          | Risk   | Effort | Files changed |
| ----- | ------------------------------ | ------ | ------ | ------------- |
| 1     | **Phase 1** — Foundation       | Low    | Medium | ~28           |
| 2     | **Phase 2** — Domain Layer     | Low    | Low    | ~26           |
| 3     | **Phase 3** — Server Actions   | Medium | Medium | ~14           |
| 4     | **Phase 4** — UI Decomposition | Low    | High   | ~19           |

**Recommendation**: Execute phases 1 and 2 together (they share no conflicts
and 2 depends on 1). Then 3. Then 4. This yields **3 reviewable pull requests**
with clean atomic commits:

1. **PR 1** — Foundation + Domain Layer (formatters, styles, badges, cards,
   lifecycle moves, schema moves)
2. **PR 2** — Server Action Layer (withGymAction, split actions)
3. **PR 3** — UI Decomposition (split pages, split aggregates)

---

## Files Summary

### New files (27)

```
lib/dashboard/formatters.ts
lib/dashboard/status-styles.ts
lib/dashboard/action-helpers.ts
lib/dashboard/aggregate-types.ts
lib/dashboard/aggregate-queries.ts
lib/dashboard/subscription-aggregates.ts
lib/dashboard/drop-in-aggregates.ts
lib/dashboard/payment-lifecycle.ts       (moved)
lib/dashboard/renewal-lifecycle.ts       (moved)
lib/dashboard/attendance-lifecycle.ts    (moved)
lib/dashboard/member-contact-lifecycle.ts (moved)
lib/dashboard/schemas/member-create-schema.ts      (moved)
lib/dashboard/schemas/change-plan-schema.ts        (moved)
lib/dashboard/schemas/log-checkin-schema.ts        (moved)
lib/dashboard/schemas/mark-paid-schema.ts          (moved)
lib/dashboard/schemas/void-payment-schema.ts       (moved)
lib/dashboard/schemas/renew-membership-schema.ts   (moved)
lib/dashboard/schemas/update-member-contact-schema.ts (moved)
lib/dashboard/schemas/drop-in-create-schema.ts     (moved)
components/dashboard/badges.tsx
components/dashboard/detail-field.tsx
components/dashboard/info-card.tsx
components/dashboard/empty-state.tsx
app/(dashboard)/members/member-actions.ts
app/(dashboard)/members/membership-actions.ts
app/(dashboard)/members/payment-actions.server.ts
app/(dashboard)/members/current-membership-summary.tsx
app/(dashboard)/members/membership-history-item.tsx
app/(dashboard)/members/payment-history-item.tsx
app/(dashboard)/members/attendance-log-item.tsx
app/(dashboard)/overview-stats-section.tsx
app/(dashboard)/overview-pinned-alerts.tsx
app/(dashboard)/drop-ins/drop-in-summary.tsx
app/(dashboard)/drop-ins/drop-in-log.tsx
```

### Deleted files (12)

```
app/(dashboard)/members/actions.ts
app/(dashboard)/members/payment-lifecycle.ts
app/(dashboard)/members/renewal-lifecycle.ts
app/(dashboard)/members/attendance-lifecycle.ts
app/(dashboard)/members/member-contact-lifecycle.ts
app/(dashboard)/members/member-create-schema.ts
app/(dashboard)/members/change-plan-schema.ts
app/(dashboard)/members/log-checkin-schema.ts
app/(dashboard)/members/mark-paid-schema.ts
app/(dashboard)/members/void-payment-schema.ts
app/(dashboard)/members/renew-membership-schema.ts
app/(dashboard)/members/update-member-contact-schema.ts
app/(dashboard)/drop-ins/drop-in-create-schema.ts
```

### Significantly modified files (4)

```
lib/dashboard/aggregates.ts        (1186 → ~370 lines)
app/(dashboard)/page.tsx           (505 → ~150 lines)
app/(dashboard)/members/[id]/page.tsx (714 → ~120 lines)
app/(dashboard)/drop-ins/page.tsx  (442 → ~100 lines)
```
