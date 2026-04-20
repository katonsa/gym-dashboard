# Member Roster Billing Risk Fix

Status: Implemented. Verified with unit tests, typecheck, lint, Next.js runtime
error checks, and a local database query.

## Problem

The `/members` roster could show `No risk` for a member whose payment was
already overdue. The visible case was a `PENDING` payment with `dueAt` earlier
than the current request time.

The member detail route did not have the same behavior because it counted
overdue payments against `new Date()`.

## Root Cause

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

## Fix

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

## Regression Coverage

`tests/dashboard-query-scopes.test.ts` now verifies:

- roster payment counts use `PENDING dueAt < asOf`
- the overdue risk filter uses the exact request time
- membership risk filtering can still receive a separate gym-local boundary

## Verification

Commands run:

- `npm test`
- `npm run typecheck`
- `npm run lint`

Runtime checks:

- Next.js dev server reported no config or session errors.
- A local Prisma query against the roster path confirmed the affected member now
  resolves to `overdue`.

## Rule Going Forward

Do not reuse gym-local day boundaries for payment delinquency. Use exact request
time for payment due comparisons, and use gym-local day boundaries only for
membership period and display-date semantics.
