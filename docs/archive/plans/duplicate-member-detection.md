# Duplicate Member Detection

Status: Implemented for manual member creation, with reusable duplicate
detection logic for future import flows.

This implementation added duplicate detection to manual member creation with a
conservative warning-and-confirm flow. The first submit checks existing members
in the same gym for matching email, matching normalized phone, or similar names.
If matches exist, no member is created; the user reviews matches and must
explicitly choose to create anyway.

For current behavior, see
`docs/features/member-management.md#duplicate-detection`.

## Implemented

- Add shared duplicate detection logic in
  `lib/dashboard/member-duplicate-detection.ts`.
  - Match email case-insensitively after trimming.
  - Match phone after stripping formatting characters.
  - Match names conservatively: normalized exact full name, swapped first/last,
    same last name with a small first-name typo, same first name with a small
    last-name typo, or initial-vs-full-name only when one side is actually an
    initial.
  - Always scope candidates by `gymId`.
  - Return matches with member id, name, status, contact fields, and reasons:
    `email`, `phone`, `similar-name`.

- Extended `createMemberSchema` and `CreateMemberActionResult`.
  - Add optional `confirmDuplicate?: boolean`.
  - Add a result variant for duplicate matches.
  - Keep existing error and success behavior.

- Updated `createMember` in `app/(dashboard)/members/member-actions.ts`.
  - Validate input, join date, and selected plan first.
  - Run duplicate detection before the transaction.
  - If matches exist and `confirmDuplicate` is not true, return duplicate
    matches without creating.
  - If confirmed, create the member as before.
  - Keep existing revalidation for `/members` and `/`.

- Updated `MemberCreateForm`.
  - On duplicate response, open an `AlertDialog` above the existing add-member
    sheet.
  - Show each matching member with name, status, email/phone when present, and
    reason badges.
  - Provide `Edit details` and `Create anyway` actions.
  - `Create anyway` resubmits captured values with `confirmDuplicate: true`.
  - On success, reset the form, close the sheet, and show the existing success
    toast.

## Public Interfaces

- `CreateMemberValues` gains optional `confirmDuplicate`.
- `CreateMemberActionResult` gains a duplicate-warning variant.
- New reusable API:
  - `findPotentialMemberDuplicatesForGym({ client, gymId, input })`
  - Pure helpers for normalization and name matching so future import flows can
    reuse the same rules without adding import UI now.

## Regression Coverage

- Added unit tests for duplicate detection:
  - Email match ignores case and whitespace.
  - Phone match ignores spaces, punctuation, and `+`.
  - Similar-name match catches exact normalized names, swapped names, initials,
    and small typos.
  - Similar-name match does not warn on unrelated full first names with the
    same initial.
  - A single member can return multiple reasons.

- Added same-gym query coverage using a fake duplicate-detection client:
  - Detection receives the current `gymId`.
  - Only matching rows are mapped into duplicate results.

## Verification

Commands run:

- `npm test`: 89 passing tests
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed after allowing network access for `next/font` Google
  font fetches

## Assumptions

- Duplicates are warnings, not hard blocks.
- Future import support means reusable duplicate-detection core only; no import
  UI or batch import endpoint in this change.
- No Prisma schema migration is required because duplicates remain allowed.
