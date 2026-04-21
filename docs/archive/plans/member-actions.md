# Member Actions Plan

Status: Phase 3 complete, with shared shadcn confirmation dialogs shipped for
suspend/unsuspend and plan changes.

Replace the three placeholder quick actions on the members roster — View profile, Suspend account, and Edit plan — with working implementations.

## Constraints

- Keep the existing route model. Member detail is a subroute inside `(dashboard)/members`.
- Use Server Components for reads, client components only for interactive controls.
- Server actions return `{ success: boolean, error?: string }`.
- Use `revalidatePath` after mutations.
- Validate all inputs with Zod.
- Scope every query through the authenticated owner's gym.
- Do not add member self-service, login accounts, or public-facing member pages.
- Do not add payment processing. Status changes and plan changes update records only.
- Keep mobile-first: 44px touch targets, single-column stacked layout on mobile.

---

## Phase 1: Member Detail Page

Add `/members/[id]` as a read-only profile page that replaces the "View profile" placeholder.

### Route structure

- `app/(dashboard)/members/[id]/page.tsx` — async Server Component.
- The `[id]` param is the member's CUID.

### Data loading

- [x] Add `loadMemberDetailData(memberId: string)` to `lib/dashboard/loaders.ts`
  - Call `requireDashboardSession("/members")` for auth.
  - Load the member by id, scoped to the owner's gym (`Member.gymId` must match the owner's gym id).
  - Load all memberships for that member (not just the current one), ordered by `startedAt` descending.
  - Load all membership payments for that member, ordered by `dueAt` descending.
  - Load all attendance records for that member, ordered by `attendedAt` descending.
  - Include the plan tier for each membership (join or select the `planTier` relation).
  - Return `null` if the member is not found or does not belong to the owner's gym.

### Page layout

- [x] Build the member detail page
  - Back link to `/members`.
  - Header: full name, status badge, billing risk badge.
  - Contact card: email, phone, join date, last attended date, notes.
  - Current membership card: plan name, billing interval, price, status, period end date, next billing date. Show "No active membership" when none exists.
  - Membership history: list of all memberships (plan, interval, status, period, price). Most recent first.
  - Payment history: list of all payments (amount, status, due date, paid date). Most recent first.
  - Attendance log: list of recent attendance records (date, source). Show a count and the last 20 entries.

### Empty and error states

- [x] Member not found → "This member does not exist or belongs to a different gym." with a back link.
- [x] No memberships → "No memberships on record."
- [x] No payments → "No payment records."
- [x] No attendance → "No attendance recorded."

### Wire "View profile" button

- [x] Replace the placeholder `onClick` in `QuickActions` with a `Link` to `/members/${member.id}`.
- [x] On the mobile card layout, make the member name itself a link to the detail page as well.

### Verification

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] Load `/members/[valid-id]` — page renders with member data.
- [x] Load `/members/[nonexistent-id]` — not-found state renders.
- [x] Back link returns to `/members`.
- [x] Page is mobile-usable.

---

## Phase 2: Suspend And Unsuspend

Add a server action to toggle a member between ACTIVE and SUSPENDED, replacing the "Suspend account" placeholder.

### Server action

- [x] Add `updateMemberStatus` to `app/(dashboard)/members/actions.ts`
  - Signature: `(values: { memberId: string, status: "ACTIVE" | "SUSPENDED" }) => Promise<ActionResult>`
  - Validate with Zod: `memberId` must be a non-empty string; `status` must be `"ACTIVE"` or `"SUSPENDED"`.
  - Authenticate via `requireDashboardSession("/members")`.
  - Confirm the member belongs to the owner's gym before updating.
  - Update `Member.status` to the requested value.
  - When suspending: also set active memberships for that member to `PAST_DUE` status, so the member stops contributing to MRR and triggers alerts.
  - When unsuspending back to ACTIVE: do **not** auto-reactivate memberships. The owner should use "Edit plan" to start a fresh plan. This avoids silently resuming billing on a stale membership.
  - `revalidatePath("/members")` after success.
  - Also `revalidatePath("/members/[id]")` for the specific member if the detail page exists.
  - Also `revalidatePath("/")` since suspension affects overview stats and alerts.

### UI changes

- [x] Replace the "Suspend account" placeholder button
  - Show "Suspend" for ACTIVE members, "Unsuspend" for SUSPENDED members.
  - Do not show the action for INACTIVE members (they should be reactivated through a different workflow or manually).
  - On click, show a confirmation dialog: "Suspend [name]? Active memberships will be paused." / "Unsuspend [name]? You can assign a new plan afterward."
  - Disable the button while the action is pending.
  - Show the action result message in the existing `actionMessage` area.

### Shipped implementation note

- [x] `app/(dashboard)/members/member-status-action.tsx` now uses
      `components/ui/alert-dialog.tsx` instead of the previous inline confirmation
      block.
- [x] The dialog keeps the existing pending and error states and still reports
      messages through the surrounding `onResult` callback.
- [x] Suspend confirmation copy now explicitly warns that active memberships are
      marked `PAST_DUE`.

### Wire into member detail page

- [x] Add the suspend/unsuspend button on the member detail page header as well.
  - Same confirmation pattern.
  - Page revalidates after action.

### Verification

- [x] Suspending an ACTIVE member sets status to SUSPENDED.
- [x] Suspending moves active memberships to PAST_DUE.
- [x] Unsuspending a SUSPENDED member sets status to ACTIVE.
- [x] Unsuspending does not reactivate memberships.
- [x] Overview stats update after suspend/unsuspend.
- [x] Member roster reflects the new status.
- [x] Member detail page reflects the new status.
- [x] Action is scoped to the owner's gym.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 3: Edit Plan (Plan Change)

Add a server action and form to change a member's plan, replacing the "Edit plan" placeholder.

### Data model behavior

A plan change means:

1. Expire or cancel the current active membership (if one exists).
2. Create a new membership with the selected plan tier and billing interval.
3. Create the first payment record on the new membership.

This is the same create-membership logic used in `createMember`, but applied to an existing member. The old membership's history is preserved.

### Server action

- [x] Add `changeMemberPlan` to `app/(dashboard)/members/actions.ts`
  - Signature: `(values: ChangeMemberPlanValues) => Promise<ActionResult>`
  - Input values:
    - `memberId: string` — required.
    - `planTierId: string` — required, must be an active plan belonging to the owner's gym.
    - `billingInterval: "MONTHLY" | "ANNUAL"` — required.
    - `effectiveDate: string` — date string (`YYYY-MM-DD`), defaults to today. This is when the new membership starts.
  - Validate with Zod.
  - Authenticate and confirm the member belongs to the owner's gym.
  - In a transaction:
    - Find and expire the current active membership for the member (set `status` to `EXPIRED`, set `canceledAt` to the effective date). A member should have at most one active membership. If there are multiple (data anomaly), expire all.
    - Look up the plan tier price based on the selected interval.
    - Create a new membership: `status: ACTIVE`, `startedAt: effectiveDate`, `currentPeriodEndsAt` and `nextBillingDate` derived from effective date + billing interval.
    - Create a PENDING payment for the first period.
  - `revalidatePath("/members")`, `revalidatePath("/members/[id]")`, `revalidatePath("/subscriptions")`, `revalidatePath("/")`.

### Validation schema

- [x] Add `change-plan-schema.ts` in `app/(dashboard)/members/`
  - `memberId`: non-empty string.
  - `planTierId`: non-empty string.
  - `billingInterval`: `"MONTHLY" | "ANNUAL"`.
  - `effectiveDate`: valid `YYYY-MM-DD` string, reuse `parseDateInput`.
  - Export as `changePlanSchema`, `ChangeMemberPlanValues`, and `ChangePlanActionResult`.

### UI changes

- [x] Replace the "Edit plan" placeholder button with a trigger that opens an inline plan change form
  - The form appears inline on the member detail page (Phase 1 must be done first).
  - Fields: plan tier select, billing interval select, effective date input (default today).
  - Show the current plan and interval as context above the form.
  - Show the new price that will apply based on the selected tier and interval.
  - Submit button: "Change plan" / "Changing plan..." while pending.
  - Success feedback: "Plan changed to [Plan Name] ([Interval])."
  - Error feedback: standard `{ error }` rendering.
  - Disable submit while pending.
  - Before running the mutation, open a confirmation dialog summarizing the new
    plan, interval, and effective date.

- [x] On the roster view, change the "Edit plan" button to link to the member detail page
  - The plan change form lives on the detail page, not inline in the roster.
  - Button label: "Edit plan" → links to `/members/[id]` (same as "View profile" but scrolled or focused on the plan section).

### Verification

- [x] Changing a plan expires the old membership and creates a new one.
- [x] New membership has correct price, period end, and billing date.
- [x] First payment record is created.
- [x] Old membership appears in the membership history on the detail page.
- [x] Subscription breakdown page reflects the new plan distribution.
- [x] MRR updates correctly.
- [x] Overview stats update.
- [x] Member with no current plan can be assigned one (same flow, no membership to expire).
- [x] Validation rejects missing plan, missing interval, invalid date.
- [x] Action is scoped to the owner's gym.
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`

### Shipped implementation note

- [x] `app/(dashboard)/members/member-plan-change-form.tsx` now validates the
      form first, then opens `AlertDialog` before executing `changeMemberPlan`.
- [x] The confirmation copy includes the selected plan name, billing interval,
      and formatted effective date when available.
- [x] Cancel only closes the dialog. Confirm runs the existing server action and
      preserves the current success and error handling.

---

## Shared helpers to extract

- [x] Extract `addBillingPeriod` and `addMonthsClamped` from `members/actions.ts` into `lib/dashboard/billing.ts`
  - These are reused by both `createMember` and `changeMemberPlan`.
  - Update `createMember` to import from the shared location.
  - Add tests for `addBillingPeriod` edge cases (month-end clamping, leap years).

---

## Suggested execution order

1. Phase 1 (member detail page) — this is a prerequisite for Phase 3's form placement.
2. Phase 2 (suspend/unsuspend) — can start as soon as Phase 1 is loadable.
3. Shared helpers extraction — do this before or alongside Phase 3.
4. Phase 3 (plan change) — depends on Phase 1 for the form host page.

Each phase is independently shippable and adds real value over the placeholders.

---

## Resolved decisions

- Plan changes create a new membership rather than mutating the existing one. This preserves full membership history.
- Suspending a member pauses their active memberships (sets to PAST_DUE). Unsuspending does not auto-reactivate them — the owner assigns a new plan explicitly.
- The plan change form lives on the member detail page, not inline in the roster table. The roster "Edit plan" button becomes a link.
- "View profile" becomes a real link; on mobile, the member name also links to the detail page.

## Out of scope for this plan

- Member deletion (destructive, needs separate consideration).
- Editing member contact details (name, email, phone) — natural follow-up but lower priority.
- Payment status management (mark as paid, void) — natural follow-up for billing workflows.
- Membership renewal/extension (distinct from plan change).
- Bulk actions on multiple members.
