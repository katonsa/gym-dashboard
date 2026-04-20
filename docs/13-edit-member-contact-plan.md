# Edit Member Contact Details Plan

Status: Implemented.

Let the gym owner edit a member's contact information — first name, last name,
email, phone, and notes — from the member detail page. This closes the last
meaningful operational gap in the member management flow: the owner can create
a member but currently has no way to correct a typo, update a phone number, or
revise notes after the initial entry.

---

## Current State

| Capability                                                          | Status                          |
| ------------------------------------------------------------------- | ------------------------------- |
| `Member` fields: `firstName`, `lastName`, `email`, `phone`, `notes` | ✅ Exist on the model           |
| Contact card display on member detail page                          | ✅ Exists with in-place editing |
| Member name display on roster and detail header                     | ✅ Updates after contact edit   |
| Server action to update contact fields                              | ✅ Exists                       |
| Edit contact form on member detail page                             | ✅ Exists                       |

## Implementation Summary

Implemented in:

- `app/(dashboard)/members/update-member-contact-schema.ts`
- `app/(dashboard)/members/member-contact-lifecycle.ts`
- `app/(dashboard)/members/actions.ts`
- `app/(dashboard)/members/member-contact-card.tsx`
- `app/(dashboard)/members/[id]/page.tsx`
- `app/(dashboard)/members/member-create-schema.ts`
- `tests/member-update-contact-schema.test.ts`
- `tests/member-create-schema.test.ts`
- `tests/member-contact-lifecycle-actions.integration.test.ts`
- `tests/run-tests.ts`
- `tests/run-integration-tests.ts`

Verification completed:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:integration`

Notes:

- `npm run build` requires network access for `next/font` Google font fetching.
- `npm run test:integration` requires access to local Postgres at
  `127.0.0.1:5432`.

---

## Problem Statement

The owner manually enters every member record. Typos happen, members change
phone numbers, and notes need updating over time. Before this implementation,
there was no way to correct any of this — the data entered at creation was
permanent until the member was deleted. For a gym owner managing 50–200 members
from a mobile browser, that was a daily friction point.

---

## What Is Being Edited

The editable fields map directly to existing `Member` model columns:

| Field       | Type   | Required | Constraints                                     |
| ----------- | ------ | -------- | ----------------------------------------------- |
| `firstName` | string | ✅ Yes   | 1–100 characters                                |
| `lastName`  | string | ✅ Yes   | 1–100 characters                                |
| `email`     | string | ❌ No    | Valid email format or empty; max 255 characters |
| `phone`     | string | ❌ No    | Free text; max 50 characters                    |
| `notes`     | string | ❌ No    | Max 1000 characters                             |

**Not editable through this form:**

- `status` — changed via suspend/unsuspend action (doc 06, Phase 2)
- `joinDate` — set at creation; changing it affects new-sign-ups-this-month
  calculations and requires separate consideration
- `gymId` — ownership, never editable
- `lastAttendedAt` — derived from attendance records, updated by check-in
  (doc 11)

---

## Constraints

- Keep the existing route model. The edit form lives on the member detail page.
- Use Server Components for reads, client components only for interactive
  controls.
- Server actions return `{ success: boolean, error?: string }`.
- Use `revalidatePath` after mutations.
- Validate all inputs with Zod.
- Scope every query through the authenticated owner's gym.
- Do not add member self-service — this is an owner-only action.
- Keep mobile-first: 44px touch targets, single-column layout on mobile.
- No confirmation dialog required — contact edits are low-risk and easily
  corrected by editing again. Consistent with standard form UX.
- Keep create and edit validation aligned for shared contact fields. If edit
  introduces max lengths, add the same max lengths to member creation so newly
  created records remain editable without unrelated cleanup.

---

## Phase 1: Server Action

### Server action

- [x] Add `updateMemberContact` to `app/(dashboard)/members/actions.ts`
  - Signature:
    `(values: UpdateMemberContactValues) => Promise<UpdateMemberContactActionResult>`
  - Input values:
    - `memberId: string` — required.
    - `firstName: string` — required, 1–100 characters.
    - `lastName: string` — required, 1–100 characters.
    - `email: string` — optional, valid email format or empty string, max 255
      characters.
    - `phone: string` — optional, free text, max 50 characters.
    - `notes: string` — optional, max 1000 characters.
  - Validate with Zod.
  - Authenticate via `requireDashboardSession("/members")`.
  - Load the member by id, scoped to the owner's gym (`Member.gymId` must
    match). Return a plain-language error if not found or out of scope.
  - Update `Member`: `firstName`, `lastName`, `email` (null if empty),
    `phone` (null if empty), `notes` (null if empty).
  - Prefer extracting the scoped mutation into `updateMemberContactForGym` so
    cross-gym behavior can be integration-tested without mocking auth.
  - `revalidatePath("/members")` — roster reflects updated name.
  - ``revalidatePath(`/members/${parsed.data.memberId}`)`` — detail page reflects
    all changes. Use the concrete member route, not the route pattern.
  - `revalidatePath("/")` — overview alerts include member names in overdue,
    expired, expiring, and inactive-member messages.
  - No subscriptions revalidation needed — contact fields do not affect
    subscription aggregates or charts.

### Validation schema

- [x] Add `update-member-contact-schema.ts` in `app/(dashboard)/members/`
  - `memberId`: non-empty string.
  - `firstName`: string, min 1, max 100, trimmed.
  - `lastName`: string, min 1, max 100, trimmed.
  - `email`: optional string. Accept empty string and coerce to `null`. When
    non-empty, validate as email format, max 255.
  - `phone`: optional string, max 50, trimmed. No format enforcement — contacts
    may be local, international, or freeform. Coerce empty string to `null`.
  - `notes`: optional string, max 1000, trimmed. Coerce empty string to `null`.
  - Export `updateMemberContactSchema`, `UpdateMemberContactValues`,
    `UpdateMemberContactActionResult`.
  - Define `UpdateMemberContactValues` from the raw form input shape:
    `z.input<typeof updateMemberContactSchema>`. Use parsed schema output only
    inside the action so transformed empty optional fields can become `null`
    without forcing the client form values to use `null`.
- [x] Update `member-create-schema.ts` to apply the same max lengths for shared
      contact fields:
  - `firstName`: max 100.
  - `lastName`: max 100.
  - `email`: max 255 before email validation.
  - `phone`: max 50.
  - `notes`: max 1000.

### Verification

- [x] Updating `firstName` and `lastName` reflects on the roster and detail
      page header on the next load.
- [x] Clearing `email` sets it to `null` in the database.
- [x] Clearing `phone` sets it to `null` in the database.
- [x] Clearing `notes` sets it to `null` in the database.
- [x] Submitting an invalid email format returns a validation error.
- [x] Submitting a blank `firstName` returns a validation error.
- [x] Submitting a blank `lastName` returns a validation error.
- [x] `notes` longer than 1000 characters returns a validation error.
- [x] Action is scoped to the owner's gym — editing a member from another gym
      returns an error.
- [x] Add `tests/member-update-contact-schema.test.ts` for trimming, optional
      field clearing to `null`, invalid email, blank names, and length limits.
- [x] Add or extend member create schema tests so creation and edit enforce the
      same shared contact field limits.
- [x] Add an integration test for `updateMemberContactForGym` that verifies a
      member from another gym returns a not-found/out-of-scope result and is not
      updated.
- [x] Import the schema test from `tests/run-tests.ts`.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 2: Edit Contact Form on Member Detail Page

### Placement

Add an **"Edit"** button to the contact card on `/members/[id]`. The contact
card currently displays email, phone, join date, last attended date, and notes
in read-only form.

The edit form replaces the contact card in-place when activated — no separate
route, no modal. This pattern is already established by the plan change form
and the check-in form on the same page.

Keep `app/(dashboard)/members/[id]/page.tsx` as a Server Component. Replace the
current inline contact card body with a small client component, for example
`MemberContactCard`, that receives serializable member contact values plus the
preformatted `joinDate` and `lastAttendedAt` labels. The client component owns
only edit/cancel state, submission state, and success/error feedback.

### Behavior

- [x] "Edit" button appears in the contact card header, next to the card title.
- [x] Clicking "Edit" switches the contact card from read view to edit view:
  - All editable fields render as inputs pre-filled with current values.
  - Non-editable fields (`joinDate`, `lastAttendedAt`) remain read-only and
    visible below the form for context.
  - **Fields:**
    - First name input (required)
    - Last name input (required)
    - Email input (optional, email keyboard on mobile)
    - Phone input (optional, phone keyboard on mobile)
    - Notes textarea (optional, max 1000 characters)
  - **Actions:**
    - "Save changes" button — submits the form.
    - "Cancel" button — discards changes and returns to read view without
      navigating away.
- [x] On success:
  - Form returns to read view.
  - Call `router.refresh()` after the server action succeeds so the already
    mounted detail page receives the revalidated Server Component payload.
  - Contact card displays updated values after the refresh.
  - Member detail header reflects updated name after the refresh.
  - Success feedback: "Contact details updated." The message must live in the
    client wrapper's read mode or another parent client state so it remains
    visible after the edit form unmounts.
- [x] On error:
  - Inline field-level validation errors for format issues (e.g. invalid email).
  - Inline action-level error for server errors (e.g. member not found).
  - Form stays open so the owner can correct and resubmit.
- [x] Use `zodResolver(updateMemberContactSchema)` in the client form for
      field-level validation. Map server/action failures to a root form error.
- [x] Disable "Save changes" while the action is pending.
- [x] Keep 44px touch targets on mobile.
- [x] Single-column stacked field layout on mobile.

### Verification

- [x] "Edit" button is visible on the contact card on mobile and desktop.
- [x] Clicking "Edit" switches the card to edit view with all fields pre-filled.
- [x] Clicking "Cancel" returns to read view without saving.
- [x] Saving a name change updates the header and roster on the next load.
- [x] Saving a cleared email removes it from the contact card.
- [x] Saving updated notes reflects on the contact card.
- [x] Invalid email shows a field-level error, form stays open.
- [x] Empty first name shows a field-level error, form stays open.
- [x] "Save changes" is disabled while pending.
- [x] Form is usable on mobile with appropriate keyboard types.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Execution Order

1. Phase 1 (server action + schema) — no UI dependencies. Establishes and
   tests the write path before any UI is built around it.
2. Phase 2 (edit form) — depends on Phase 1. Inline form on the contact card,
   follows the same pattern as existing forms on the page.

Both phases were independently shippable. Phase 1 established and tested the
write path before the UI was built around it.

---

## Decisions

- **No confirmation dialog.** Contact edits are low-risk — the owner can
  correct mistakes by editing again. Adding a confirmation dialog adds friction
  without meaningful safety benefit. Consistent with standard edit-form UX.
- **In-place form, not a modal or separate route.** The edit form replaces the
  contact card in-place, consistent with the plan change and check-in forms
  already on the page. No new route needed.
- **`joinDate` is not editable.** Changing `joinDate` affects the new-sign-ups-
  this-month calculation and requires separate consideration. Excluded from this
  form.
- **Phone is free text.** No format enforcement — gym members may use local,
  international, or non-numeric contact identifiers. Consistent with drop-in
  visitor contact handling (doc 02).
- **Empty optional fields coerce to `null`.** An empty email or phone input
  clears the field in the database rather than storing an empty string.
- **No roster quick action.** Contact editing requires a form — it cannot be
  a one-tap action like check-in. The roster "Edit" link navigates to the
  detail page, consistent with "Edit plan."

---

## Out of Scope

- Editing `joinDate` — affects aggregate calculations, needs separate
  consideration.
- Member deletion — destructive, needs separate consideration.
- Bulk contact editing across multiple members.
- Member self-service contact updates — no member-facing UI in v1.
- Contact import or sync from external systems — deferred to v1.5.
- Duplicate detection (e.g. same email already exists) — deferred; adds query
  complexity for low frequency benefit at this scale.
