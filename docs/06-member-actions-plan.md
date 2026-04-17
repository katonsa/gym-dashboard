# Member Actions Plan

Status: Pending review.

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

- [ ] Add `loadMemberDetailData(memberId: string)` to `lib/dashboard/loaders.ts`
  - Call `requireDashboardSession("/members")` for auth.
  - Load the member by id, scoped to the owner's gym (`Member.gymId` must match the owner's gym id).
  - Load all memberships for that member (not just the current one), ordered by `startedAt` descending.
  - Load all membership payments for that member, ordered by `dueAt` descending.
  - Load all attendance records for that member, ordered by `attendedAt` descending.
  - Include the plan tier for each membership (join or select the `planTier` relation).
  - Return `null` if the member is not found or does not belong to the owner's gym.

### Page layout

- [ ] Build the member detail page
  - Back link to `/members`.
  - Header: full name, status badge, billing risk badge.
  - Contact card: email, phone, join date, last attended date, notes.
  - Current membership card: plan name, billing interval, price, status, period end date, next billing date. Show "No active membership" when none exists.
  - Membership history: list of all memberships (plan, interval, status, period, price). Most recent first.
  - Payment history: list of all payments (amount, status, due date, paid date). Most recent first.
  - Attendance log: list of recent attendance records (date, source). Show a count and the last 20 entries.

### Empty and error states

- [ ] Member not found → "This member does not exist or belongs to a different gym." with a back link.
- [ ] No memberships → "No memberships on record."
- [ ] No payments → "No payment records."
- [ ] No attendance → "No attendance recorded."

### Wire "View profile" button

- [ ] Replace the placeholder `onClick` in `QuickActions` with a `Link` to `/members/${member.id}`.
- [ ] On the mobile card layout, make the member name itself a link to the detail page as well.

### Verification

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Load `/members/[valid-id]` — page renders with member data.
- [ ] Load `/members/[nonexistent-id]` — not-found state renders.
- [ ] Back link returns to `/members`.
- [ ] Page is mobile-usable.

---

## Phase 2: Suspend And Unsuspend

Add a server action to toggle a member between ACTIVE and SUSPENDED, replacing the "Suspend account" placeholder.

### Server action

- [ ] Add `updateMemberStatus` to `app/(dashboard)/members/actions.ts`
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

- [ ] Replace the "Suspend account" placeholder button
  - Show "Suspend" for ACTIVE members, "Unsuspend" for SUSPENDED members.
  - Do not show the action for INACTIVE members (they should be reactivated through a different workflow or manually).
  - On click, show a brief inline confirmation: "Suspend [name]? Active memberships will be paused." / "Unsuspend [name]? You can assign a new plan afterward."
  - Disable the button while the action is pending.
  - Show the action result message in the existing `actionMessage` area.

### Wire into member detail page

- [ ] Add the suspend/unsuspend button on the member detail page header as well.
  - Same confirmation pattern.
  - Page revalidates after action.

### Verification

- [ ] Suspending an ACTIVE member sets status to SUSPENDED.
- [ ] Suspending moves active memberships to PAST_DUE.
- [ ] Unsuspending a SUSPENDED member sets status to ACTIVE.
- [ ] Unsuspending does not reactivate memberships.
- [ ] Overview stats update after suspend/unsuspend.
- [ ] Member roster reflects the new status.
- [ ] Member detail page reflects the new status.
- [ ] Action is scoped to the owner's gym.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build`.

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

- [ ] Add `changeMemberPlan` to `app/(dashboard)/members/actions.ts`
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

- [ ] Add `change-plan-schema.ts` in `app/(dashboard)/members/`
  - `memberId`: non-empty string.
  - `planTierId`: non-empty string.
  - `billingInterval`: `"MONTHLY" | "ANNUAL"`.
  - `effectiveDate`: valid `YYYY-MM-DD` string, reuse `parseDateInput`.
  - Export as `changePlanSchema`, `ChangeMemberPlanValues`, and `ChangePlanActionResult`.

### UI changes

- [ ] Replace the "Edit plan" placeholder button with a trigger that opens an inline plan change form
  - The form appears inline on the member detail page (Phase 1 must be done first).
  - Fields: plan tier select, billing interval select, effective date input (default today).
  - Show the current plan and interval as context above the form.
  - Show the new price that will apply based on the selected tier and interval.
  - Submit button: "Change plan" / "Changing plan..." while pending.
  - Success feedback: "Plan changed to [Plan Name] ([Interval])."
  - Error feedback: standard `{ error }` rendering.
  - Disable submit while pending.

- [ ] On the roster view, change the "Edit plan" button to link to the member detail page
  - The plan change form lives on the detail page, not inline in the roster.
  - Button label: "Edit plan" → links to `/members/[id]` (same as "View profile" but scrolled or focused on the plan section).

### Verification

- [ ] Changing a plan expires the old membership and creates a new one.
- [ ] New membership has correct price, period end, and billing date.
- [ ] First payment record is created.
- [ ] Old membership appears in the membership history on the detail page.
- [ ] Subscription breakdown page reflects the new plan distribution.
- [ ] MRR updates correctly.
- [ ] Overview stats update.
- [ ] Member with no current plan can be assigned one (same flow, no membership to expire).
- [ ] Validation rejects missing plan, missing interval, invalid date.
- [ ] Action is scoped to the owner's gym.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Shared helpers to extract

- [ ] Extract `addBillingPeriod` and `addMonthsClamped` from `members/actions.ts` into `lib/dashboard/billing.ts`
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
