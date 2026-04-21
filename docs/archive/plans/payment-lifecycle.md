# Payment Lifecycle Management

Status: Implemented. Verified with unit tests, DB-backed integration tests,
typecheck, lint, production build, and browser smoke testing.

## Original State Assessment

Before this work, payments in the gym dashboard were **write-once, read-only
records**. They were created implicitly in two places:

| Trigger                      | Creates                          | Status    |
| ---------------------------- | -------------------------------- | --------- |
| `createMember` (with a plan) | First-period `MembershipPayment` | `PENDING` |
| `changeMemberPlan`           | First-period `MembershipPayment` | `PENDING` |

The schema supported four statuses — `PENDING`, `PAID`, `OVERDUE`, `VOID` —
and the seed script exercised all four, but the owner had no UI to transition a
payment between statuses. The only "overdue" detection was implicit: the
`getOverduePaymentWhere` scope in `lib/dashboard/aggregates.ts` treated any
`PENDING` payment with `dueAt < now` as overdue alongside explicitly-`OVERDUE`
records.

### What already worked

- **Read path**: Payment history renders on the member detail page with status
  badges and pagination.
- **Alerts**: The overview's "Overdue payments" pinned-alert card surfaces the
  count and first offender via `getOverduePaymentAlerts`.
- **Billing risk badge**: Each member profile shows `overdue` / `expiring` /
  `clear` risk.

### Gaps addressed by this plan

1. **No "Mark as paid" action** — owners saw the alert but could not resolve it.
2. **No "Void" action** — stale `PENDING` payments lingered after entry
   mistakes or same-day plan corrections.
3. **No overview-level resolution path** — overdue alerts did not link owners to
   the actionable payment section.
4. **No collection / aging view** — owners could not see _how_ overdue their
   receivables were (3 days vs 30 days).

---

## Problem Statement

The gym owner receives overdue payment alerts every morning but has no way to
act on them from the dashboard. Resolving a payment requires leaving the app,
recording it externally, and hoping no one forgets to update the record later.
This defeats the project's core principle that **every piece of data shown must
be actionable**.

---

## Constraints

- Keep the existing route model. Payment actions live on the member detail page.
- Use Server Components for reads, client components only for interactive
  controls.
- Server actions return `{ success: boolean, error?: string }`.
- Use `revalidatePath` after mutations.
- Validate all inputs with Zod.
- Scope every query through the authenticated owner's gym.
- Do not add payment processing or gateway integration. Status changes update
  records only.
- Keep mobile-first: 44px touch targets, single-column stacked layout on mobile.

---

## Implementation Notes

- Server actions remain in `app/(dashboard)/members/actions.ts`; they handle
  authentication, owner gym lookup, action-result mapping, and `revalidatePath`.
- Shared transaction logic lives in
  `app/(dashboard)/members/payment-lifecycle.ts` so it can be exercised by
  DB-backed integration tests without bypassing production authentication.
- Payment status transitions use guarded `updateMany` calls scoped by `gymId`
  and current status. This prevents stale reads from overwriting a concurrent
  paid/void transition.
- The member detail payment card renders client-only controls through
  `PaymentActions`. Confirmation dialogs stay open on server-action errors and
  close only after success.
- Overview overdue alerts deep link to `/members/[memberId]#payments`; the
  member detail page exposes a `#payments` anchor with scroll offset.
- `getOverdueAgingSummary` groups overdue receivables into **1-7 days**,
  **8-14 days**, **15-30 days**, and **30+ days** buckets.
- The overview inline "Mark paid" button remains a stretch goal. The shipped
  path is the deep link to the fully actionable member payment section.

## Verification Commands

- `npm test`
- `npm run test:integration`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

`npm run test:integration` requires local Postgres from `docker compose up -d`
and reads `.env` before importing Prisma.

Browser smoke coverage used the seeded owner account to verify sign-in, the
overview billing health card, overdue alert deep link to `#payments`, the member
payment action dialogs, and the `/members`, `/subscriptions`, and `/drop-ins`
routes with no Next runtime errors or browser console errors.

---

## Phase 1: Mark as Paid

The highest-value action. Let the owner record that a payment has been
collected.

### Server action

- [x] Add `markPaymentPaid` to `app/(dashboard)/members/actions.ts`
  - Signature:
    `(values: { paymentId: string }) => Promise<MarkPaidActionResult>`
  - Validate with Zod: `paymentId` must be a non-empty string.
  - Authenticate via `requireDashboardSession("/members")`.
  - Load the `MembershipPayment` by id, scoped to the owner's gym
    (`payment.gymId` matches the gym).
  - Reject if the payment is already `PAID` or `VOID` — only `PENDING` and
    `OVERDUE` payments can be marked paid.
  - Update: `status → PAID`, `paidAt → now()`.
  - If the parent membership is `PAST_DUE` **and** no other unpaid payments
    remain for that membership, set the membership back to `ACTIVE` and advance
    `currentPeriodEndsAt` and `nextBillingDate` forward by one billing period
    (using the existing `addBillingPeriod` helper). This closes the billing loop
    opened by the suspend action and prevents the membership from immediately
    re-triggering the expiring alert cluster.
  - `revalidatePath("/members")`, `revalidatePath("/members/[memberId]")`,
    `revalidatePath("/")`.

### Validation schema

- [x] Add `mark-paid-schema.ts` in `app/(dashboard)/members/`
  - `paymentId`: non-empty string.
  - Export `markPaidSchema`, `MarkPaidValues`, `MarkPaidActionResult`.

### UI — Member detail page

- [x] Add a **"Mark paid"** button to each `PaymentHistoryItem` whose status is
      `PENDING` or `OVERDUE`.
  - Button opens a confirmation dialog:
    _"Record [amount] as paid? This will mark the payment as collected today."_
  - On success, the payment row updates to `PAID` with today's date.
  - On error, show inline feedback.
  - Disable the button while the action is pending.

### Data changes

- No schema migration. Uses existing `MembershipPayment.status` and `paidAt`
  fields.

### Verification

- [x] Marking an `OVERDUE` payment sets status to `PAID` and `paidAt` to today.
- [x] Marking a `PENDING` payment sets status to `PAID` and `paidAt` to today.
- [x] Attempting to mark a `PAID` payment returns an error.
- [x] Attempting to mark a `VOID` payment returns an error.
- [x] When the last unpaid payment on a `PAST_DUE` membership is marked paid,
      the membership returns to `ACTIVE` and the billing period advances.
- [x] When there are other unpaid payments on the membership, the membership
      stays `PAST_DUE`.
- [x] Overview overdue payment count decreases after marking paid.
- [x] Member detail billing risk badge updates.
- [x] Action is scoped to the owner's gym.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 2: Void Payment

Let the owner cancel a payment that should not have been created (e.g. plan
change corrected the same day, or double-entry).

### Server action

- [x] Add `voidPayment` to `app/(dashboard)/members/actions.ts`
  - Signature:
    `(values: { paymentId: string, reason?: string }) => Promise<ActionResult>`
  - Validate with Zod: `paymentId` non-empty string, `reason` optional string
    (max 500 characters).
  - Only `PENDING` and `OVERDUE` payments can be voided.
    `PAID` payments cannot be voided (no refund workflow in v1).
  - Update: `status → VOID`, append reason to `notes`.
  - Does **not** change membership status — voiding a payment is a bookkeeping
    correction, not a billing event.
  - `revalidatePath("/members")`, `revalidatePath("/members/[memberId]")`,
    `revalidatePath("/")`.

### Validation schema

- [x] Add `void-payment-schema.ts` in `app/(dashboard)/members/`
  - `paymentId`: non-empty string.
  - `reason`: optional string, max 500.
  - Export `voidPaymentSchema`, `VoidPaymentValues`, `VoidPaymentActionResult`.

### UI — Member detail page

- [x] Add a **"Void"** secondary/destructive button next to "Mark paid" on
      `PENDING` / `OVERDUE` payment rows.
  - Confirmation dialog:
    _"Void this [amount] payment? It will be removed from billing calculations.
    This cannot be undone."_
  - Optional reason text input inside the dialog.
  - Disable the button while the action is pending.

### Verification

- [x] Voiding a `PENDING` payment sets status to `VOID`.
- [x] Voiding an `OVERDUE` payment sets status to `VOID`.
- [x] Attempting to void a `PAID` payment returns an error.
- [x] Voiding with a reason appends the reason to the payment notes.
- [x] Overview overdue payment count decreases after voiding an overdue payment.
- [x] Voided payment does not contribute to MRR or overdue counts.
- [x] Action is scoped to the owner's gym.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 3: Payment Actions from Overview Alerts

Bridge the gap between "seeing the alert" and "resolving it".

### Deep link (primary)

- [x] Make each overdue-payment alert card on the overview page a link to
      `/members/[memberId]` (the member detail page with the payment section
      visible).
  - The member detail page already has the "Mark paid" / "Void" buttons from
    Phases 1–2.
  - The `DashboardAlert` type already carries `memberId`.

### Inline action (stretch goal)

- [x] Render a small "Mark paid" button directly inside the overview alert card.
  - Reuses the same `markPaymentPaid` server action.
  - On success, the alert disappears on the next revalidation.

The deep link approach is recommended first — it adds zero new server-side code
and provides a complete resolution path. The inline action can be layered on
later if owners find the extra click frustrating.

### Verification

- [x] Clicking an overdue payment alert navigates to the correct member detail
      page.
- [x] (Stretch) Inline "Mark paid" on the overview resolves the alert.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 4: Overdue Aging Summary

A small analytical widget on the overview page that gives owners a sense of how
long payments have been outstanding, converting the flat "you have N overdue"
count into something actionable.

### Data

- [x] Add `getOverdueAgingSummary(gymId, now, client)` to
      `lib/dashboard/aggregates.ts`.
  - Query: group overdue payments into aging buckets:
    **1–7 days**, **8–14 days**, **15–30 days**, **30+ days**.
  - Return: `{ bucket: string, count: number, totalAmount: number }[]`.

### UI

- [x] Render a "Billing health" card on the overview page.
  - Each aging bucket is a row with count and total amount.
  - Keeps the page information-dense without adding a full new route.
  - Show "No overdue payments" empty state when all buckets are zero.

### Verification

- [x] Aging buckets render with correct counts using seed data (Maya ~3 days
      overdue → 1–7 day bucket, Nadia ~8 days overdue → 8–14 day bucket).
- [x] Empty state renders when there are no overdue payments.
- [x] Amounts format correctly with the gym's currency code.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Suggested execution order

1. Phase 1 (Mark as Paid) — highest value, no dependencies.
2. Phase 2 (Void Payment) — shares schema pattern with Phase 1.
3. Phase 3 (Alert deep links) — depends on Phases 1–2 for the action buttons.
4. Phase 4 (Aging summary) — independent read-only work, can run in parallel
   with Phase 1.

Each phase is independently shippable and adds real value.

---

## Decisions

- **Membership auto-reactivation on payment.** Auto-reactivate. When the last
  unpaid payment on a `PAST_DUE` membership is marked paid, the membership
  automatically returns to `ACTIVE` and the billing period advances. The owner
  does not need to manually reassign a plan.

- **No refund / reversal in v1.** Accepted. `PAID` payments cannot be voided or
  reversed. If a payment is recorded by mistake, the owner adds a manual note.
  A `REFUNDED` status and credit memo pattern are deferred to a future
  milestone.

- **User-facing label: "Void" vs "Cancel".** Use "Void". This aligns with the
  data model enum value and standard accounting terminology.

---

## Out of scope for this plan

- Automatic billing / payment gateway integration (per project brief §6).
- Recurring payment generation (auto-creating next-period payments on renewal).
- Refunds and credit memos.
- Receipts / invoice PDF generation.
- Bulk payment actions (mark multiple payments paid at once).
- Payment editing (changing the amount or due date of an existing payment).
