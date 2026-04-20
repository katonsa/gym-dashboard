# Member Roster Billing Risk Fix

Status: Implemented. Verified with unit tests, typecheck, lint, Next.js runtime
error checks, and local database queries.

## Problem

### Overdue Payment Timing

The `/members` roster could show `No risk` for a member whose payment was
already overdue. The visible case was a `PENDING` payment with `dueAt` earlier
than the current request time.

The member detail route did not have the same behavior because it counted
overdue payments against `new Date()`.

### Membership Selection Mismatch

The roster could also show `No risk` when the member profile showed an expiring
membership. The confirmed local case was Katon Atmaja:

- latest roster membership: `PAST_DUE`, period ending `2026-05-20`
- profile-selected membership: `ACTIVE`, period ending `2026-04-21`
- overdue payment count: `0`

The profile displayed the `ACTIVE` membership as expiring, but the roster
calculated billing risk from the latest `PAST_DUE` membership and fell through
to `clear`.

The profile also rendered same-day expiry as `Expires in 0 days.` because the
membership was still expiring on the gym-local day, but the remaining full-day
count was zero.

## Root Cause

### Overdue Payment Timing

`loadMemberRosterPage()` normalized the request timestamp to the start of the
gym-local day and passed that value through the entire roster query path.

That value is correct for membership date calculations. A membership that ends
on a gym-local date should remain current through that local day.

It is not correct for payment overdue checks. Payment risk should use the exact
request time, because the existing overdue rule is:

- `status = OVERDUE`, or
- `status = PENDING` and `dueAt < now`

Using the gym-local day boundary delayed same-day `PENDING` payments from
appearing as overdue on `/members`.

### Membership Selection Mismatch

The roster query selected only one membership per member: the newest
`ACTIVE`, `PAST_DUE`, or `EXPIRED` membership. Roster risk then read
`member.memberships[0]`.

The profile loaded all memberships and selected the first `ACTIVE` or `EXPIRED`
membership in newest-first order. This intentionally excludes `PAST_DUE` and
`CANCELED` memberships from the current membership card.

Those two selection rules diverged when a newer `PAST_DUE` membership existed
above an older active or expired display membership.

The `Expires in 0 days.` copy came from flooring the date difference in whole
days and interpolating the result directly.

## Fix

### Overdue Payment Timing

The roster query now uses two timestamps:

| Timestamp        | Used for                                      |
| ---------------- | --------------------------------------------- |
| `paymentAsOf`    | overdue payment counts and overdue filtering  |
| `membershipAsOf` | expired and expiring membership risk filters  |

`loadMemberRosterPage()` passes the exact request time into payment risk query
paths and keeps the gym-local day boundary for membership status logic.

The changed files are:

- `lib/dashboard/loaders.ts`
- `lib/dashboard/query-scopes.ts`
- `tests/dashboard-query-scopes.test.ts`

### Membership Selection Mismatch

Risk display now uses a shared `getCurrentDisplayMembership()` helper. It
selects the first `ACTIVE` or `EXPIRED` membership in newest-first order, so the
roster and profile calculate from the same display membership.

The roster query now loads the relevant membership set instead of `take: 1`, so
the helper can see past a newer `PAST_DUE` row. The roster still prioritizes
overdue payments above membership risk.

Same-day expiring memberships now render `Expires today.` via
`getExpiringMembershipPeriodText()`.

The changed files are:

- `lib/dashboard/calculations.ts`
- `lib/dashboard/member-roster.ts`
- `lib/dashboard/query-scopes.ts`
- `app/(dashboard)/members/[id]/page.tsx`
- `app/(dashboard)/members/current-membership-summary.tsx`
- `tests/dashboard-calculations.test.ts`

## Regression Coverage

`tests/dashboard-query-scopes.test.ts` now verifies:

- roster payment counts use `PENDING dueAt < asOf`
- the overdue risk filter uses the exact request time
- membership risk filtering can still receive a separate gym-local boundary

`tests/dashboard-calculations.test.ts` now verifies:

- a newer `PAST_DUE` membership does not mask an older expiring membership
- a newer `PAST_DUE` membership does not mask an older expired membership
- overdue payment risk still overrides membership risk
- the shared membership selector picks the same display membership for roster
  and profile data
- same-day expiring copy renders as `Expires today.`

## Verification

Commands run:

- `npm test`
- `npm run typecheck`
- `npm run lint`

Runtime checks:

- Next.js dev server reported no config or session errors.
- A local Prisma query against the roster path confirmed the affected member now
  resolves to `overdue`.
- A local Prisma query confirmed the Katon Atmaja data shape that caused the
  roster/profile mismatch.

## Rule Going Forward

Do not reuse gym-local day boundaries for payment delinquency. Use exact request
time for payment due comparisons, and use gym-local day boundaries only for
membership period and display-date semantics.

Do not calculate roster and profile billing risk from different membership
selection rules. Use `getCurrentDisplayMembership()` for display-oriented
current membership selection, and keep overdue payments as the top-priority
billing risk.
