# Manual Check-In / Attendance Entry

Status: Implemented.

Let the gym owner manually log a member attendance record from two surfaces:
the member roster (quick action) and the member detail page. This closes the
write-path gap on `AttendanceRecord` — the model, loader, and paginated display
already exist, but there is no way to create a record through the UI.

---

## Current State

| Capability                                 | Status                                   |
| ------------------------------------------ | ---------------------------------------- |
| `AttendanceRecord` model in Prisma         | ✅ Exists                                |
| `loadMemberAttendancePage` loader          | ✅ Exists (paginated, member detail)     |
| Attendance log display on member detail    | ✅ Exists                                |
| Sessions attended count on roster          | ✅ Exists                                |
| Inactive member alert (30+ days)           | ✅ Exists (uses `Member.lastAttendedAt`) |
| Server action to create `AttendanceRecord` | ✅ Exists                                |
| Check-in UI on member detail page          | ✅ Exists                                |
| Check-in quick action on member roster     | ✅ Exists                                |

---

## Implementation Summary

Implemented on 2026-04-19.

### Server-side write path

- `app/(dashboard)/members/actions.ts`
  - Added `logMemberCheckIn(values)`.
  - Authenticates with `requireDashboardSession("/members")`.
  - Looks up the authenticated owner's first gym before writing.
  - Revalidates `/members`, `/members/${memberId}`, and `/`.
- `app/(dashboard)/members/attendance-lifecycle.ts`
  - Added `logMemberCheckInForGym`.
  - Creates an `AttendanceRecord` with `source: "MANUAL"`.
  - Updates `Member.lastAttendedAt` only when the new check-in date is more
    recent than the stored value, or when no value exists.
  - Rejects members outside the gym scope with a `not-found` result.
- `app/(dashboard)/members/log-checkin-schema.ts`
  - Added Zod validation for `memberId`, `attendedAt`, and `notes`.
  - Reuses `parseDateInput`.
  - Rejects future check-in dates and notes longer than 500 characters.

### Member detail UI

- `app/(dashboard)/members/member-checkin-form.tsx`
  - Adds a "Log check-in" dialog for `/members/[id]`.
  - Supports date and optional single-line notes.
  - Defaults the date to the gym-local current date from the server-rendered
    page.
  - Disables submission while pending and shows success/error feedback.
- `app/(dashboard)/members/[id]/page.tsx`
  - Places the form in the attendance section header.

### Roster quick action

- `app/(dashboard)/members/member-quick-checkin-action.tsx`
  - Adds a one-tap "Check in" action using today's gym-local date.
  - Disables while pending to reduce double-submission risk.
  - Reports success/error through the roster message area.
- `app/(dashboard)/members/member-roster.tsx`
  - Adds the quick action to each mobile card and desktop row.
- `app/(dashboard)/members/page.tsx`
  - Passes the gym-local check-in date to the roster.

### Tests

- `tests/member-log-checkin-schema.test.ts`
  - Covers valid values, optional notes, missing member, invalid dates, future
    dates, and notes length.
- `tests/attendance-lifecycle-actions.integration.test.ts`
  - Covers manual attendance creation, `source: "MANUAL"`, newer
    `lastAttendedAt` updates, older check-ins preserving `lastAttendedAt`, and
    cross-gym rejection.
- `tests/run-tests.ts` and `tests/run-integration-tests.ts`
  - Include the new tests.

---

## Problem Statement

The owner can see attendance history but has no way to log a visit. This means
`lastAttendedAt` is never updated after seeding, inactive member alerts grow
stale over time, and the sessions count never reflects real gym activity.

---

## Constraints

- Keep the existing route model.
- Use Server Components for reads, client components only for interactive controls.
- Server actions return `{ success: boolean, error?: string }`.
- Use `revalidatePath` after mutations.
- Validate all inputs with Zod.
- Scope every query through the authenticated owner's gym.
- Keep mobile-first: 44px touch targets, single-column layout on mobile.
- QR code check-in is out of scope — manual owner entry only.

---

## Data Model Behavior

A manual check-in means:

1. Create an `AttendanceRecord` for the member with `attendedAt` set to the
   selected date and `source` set to `"MANUAL"`.
2. Update `Member.lastAttendedAt` to the check-in date if it is more recent
   than the current value.

Updating `lastAttendedAt` is required because the inactive member alert and
churn risk logic depend on it. Deriving it from records on every query is
slower and adds unnecessary complexity.

---

## Phase 1: Server Action

### Server action

- [x] Add `logMemberCheckIn` to `app/(dashboard)/members/actions.ts`
  - Signature:
    `(values: LogCheckInValues) => Promise<ActionResult>`
  - Input values:
    - `memberId: string` — required.
    - `attendedAt: string` — date string (`YYYY-MM-DD`), defaults to today.
    - `notes: string` — optional, max 500 characters.
  - Validate with Zod.
  - Authenticate via `requireDashboardSession("/members")`.
  - Confirm the member belongs to the owner's gym before writing.
  - In a transaction:
    - Create `AttendanceRecord`: `memberId`, `attendedAt` (parsed from input),
      `source: "MANUAL"`, `notes` if provided.
    - Update `Member.lastAttendedAt` to `attendedAt` if `attendedAt` is more
      recent than the current `lastAttendedAt` value (or if `lastAttendedAt`
      is null).
  - `revalidatePath("/members")`.
  - `revalidatePath("/members/[id]")` for the specific member.
  - `revalidatePath("/")` since `lastAttendedAt` affects the inactive member
    alert on the overview.

### Validation schema

- [x] Add `log-checkin-schema.ts` in `app/(dashboard)/members/`
  - `memberId`: non-empty string.
  - `attendedAt`: valid `YYYY-MM-DD` string, reuse `parseDateInput`. Must not
    be a future date.
  - `notes`: optional string, max 500 characters.
  - Export `logCheckInSchema`, `LogCheckInValues`, `LogCheckInActionResult`.

### Verification

- [x] Check-in creates an `AttendanceRecord` with `source: "MANUAL"`.
- [x] Check-in with a date more recent than `lastAttendedAt` updates
      `Member.lastAttendedAt`.
- [x] Check-in with a date older than `lastAttendedAt` does not update
      `Member.lastAttendedAt`.
- [x] Check-in with a future date is rejected.
- [x] Action is scoped to the owner's gym.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 2: Check-In UI on Member Detail Page

### Placement

Add a **"Log check-in"** button in the attendance section header on the member
detail page (`/members/[id]`), next to the "Attendance log (N)" heading.

### Behavior

- [x] Button opens an inline form or dialog with:
  - **Date input** — defaults to today, cannot be a future date.
  - **Notes input** — optional, single line, max 500 characters.
  - **Submit button** — "Log check-in" / "Logging..." while pending.
- [x] On success:
  - Show inline feedback: "Check-in logged for [date]."
  - Attendance log reloads with the new entry at the top.
  - Sessions count in the page header updates.
- [x] On error: show inline error message.
- [x] Disable submit while action is pending.
- [x] Keep 44px touch targets on mobile.

### Verification

- [x] "Log check-in" button is visible on mobile and desktop.
- [x] Submitting adds a new row to the attendance log.
- [x] Sessions count increments.
- [x] `lastAttendedAt` updates if the check-in date is more recent.
- [x] Overview inactive alert clears if the member was previously flagged.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 3: Check-In Quick Action on Member Roster

### Placement

Add a **"Check in"** quick action button on each member row/card in the roster
(`/members`), alongside the existing "Edit plan" and "Suspend" actions.

### Behavior

- [x] Button immediately logs a check-in for **today** with no additional input.
  - No dialog or form — one tap, done. This is the fast floor-level action.
  - If the owner needs to log a different date, they go to the member detail page.
- [x] On success:
  - Show brief inline feedback on the row/card: "Checked in ✓"
  - Roster revalidates — sessions count and billing risk badge update.
- [x] On error: show brief inline error on the row/card.
- [x] Disable the button briefly while the action is pending to prevent
      double-submission.
- [x] Keep 44px touch targets on mobile.

### Verification

- [x] "Check in" button appears on each member card (mobile) and row (desktop).
- [x] Tapping checks in the member for today with no extra steps.
- [x] Sessions count updates on the roster row.
- [x] `lastAttendedAt` updates.
- [x] Overview inactive alert clears if member was previously flagged.
- [x] Double-tap does not create duplicate records (button disabled while pending).
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Suggested Execution Order

1. Phase 1 (server action + schema) — no UI dependencies, establishes the
   write path and validation.
2. Phase 2 (member detail UI) — uses the server action, adds the full form
   with date and notes.
3. Phase 3 (roster quick action) — uses the same server action with today's
   date hardcoded, no form needed.

Each phase is independently shippable.

---

## Resolved Decisions

- ~~Duplicate check-in guard.~~ ✅ **Multiple check-ins per day are allowed.**
  Covers edge cases like morning + evening sessions. Double-tap risk on the
  roster is mitigated by disabling the button while the action is pending.

- ~~Notes on roster quick action.~~ ✅ **No notes on the roster quick action
  is acceptable.** Owner uses the member detail form if a note is needed.

---

## Out of Scope

- QR code check-in — deferred, requires camera access and code generation.
- Bulk check-in (multiple members at once).
- Member self check-in — no member-facing UI in v1.
- Editing or deleting an existing attendance record.
- Check-in notifications or confirmations sent to the member.
- Attendance reporting or export.
