# Member Management

Status: Active. Covers owner/admin member records in `/members`.

## Overview

Gym owners manage member records from the Members route. Members are dashboard
data only; they do not have login accounts or self-service profiles.

The current member workflow supports:

- roster search, filtering, pagination, and profile links
- manual member creation with optional plan assignment
- duplicate warnings before manual creation
- contact editing from the member detail page
- status changes between active and suspended
- plan changes and membership renewal
- manual check-ins and payment status actions

## Manual Member Creation

The add-member form lives in `app/(dashboard)/members/member-create-form.tsx`
and calls the `createMember` server action in
`app/(dashboard)/members/member-actions.ts`.

Creation accepts name, optional email, optional phone, status, join date, an
optional active plan, billing interval, and notes. When a plan is selected, the
server action creates the member, first membership, and first pending payment in
one transaction.

After a successful create, the action revalidates `/members` and `/` so the
roster and dashboard summary reload fresh server data.

The member action files remain App Router `"use server"` entrypoints, but the
write workflows now delegate to focused services under `lib/members`,
`lib/memberships`, `lib/billing`, and `lib/attendance`.

## Duplicate Detection

Manual member creation warns before saving when an existing member in the same
gym may already represent the person being entered.

Duplicate detection is intentionally a warning, not a hard block. Owners can
still create the member after reviewing matches and choosing `Create anyway`.
This avoids blocking legitimate cases such as family members sharing contact
details or intentionally duplicated historical records.

The duplicate check runs after schema validation and active-plan validation, but
before the database transaction that creates the member.

Matching rules live in `lib/members/duplicate-detection.ts` and are
shared so future import flows can reuse the same behavior.

The current rules are:

- email match: trim and compare case-insensitively
- phone match: strip non-digits before comparing
- similar-name match:
  - exact normalized first and last name
  - swapped first and last name
  - initial-vs-full-name when one side is actually an initial
  - one-character typo in first or last name for names of at least three
    characters

Matches are scoped by `gymId` and return the member id, name, status, available
contact fields, and reason badges: `email`, `phone`, and `similar-name`.

## Duplicate Confirmation Flow

When duplicates are found, `createMember` returns a duplicate-warning result
instead of creating records. The client form opens a confirmation dialog that
lists matching members and their match reasons.

The owner can:

- choose `Edit details`, which closes the dialog and keeps the current form
  values
- choose `Create anyway`, which resubmits the same values with
  `confirmDuplicate: true`

Confirmed submissions still run the normal server-side validation and scoped
write path.

## Public Interfaces

`CreateMemberValues` includes optional `confirmDuplicate?: boolean`.

`CreateMemberActionResult` can be:

- `{ success: true }`
- `{ success: false, error: string }`
- `{ success: false, duplicateMatches: MemberDuplicateMatch[] }`

Reusable duplicate-detection exports:

- `findPotentialMemberDuplicatesForGym({ client, gymId, input })`
- `getMemberDuplicateReasons(input, member)`
- `isMatchingEmail(left, right)`
- `isMatchingPhone(left, right)`
- `isSimilarMemberName(input, member)`

## Regression Coverage

`tests/member-duplicate-detection.test.ts` covers:

- case-insensitive email matching
- formatted phone matching
- exact, swapped, initial, and typo name matching
- avoiding broad same-initial false positives
- multiple reasons for a single match
- same-gym query shape and result mapping

Use the standard verification commands before larger member-management changes:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
