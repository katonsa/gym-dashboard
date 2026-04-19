# Member Renewal Plan

Status: Phase 4 complete.

Let the gym owner manually renew a member's expiring or expired membership
from two surfaces: the member detail page and the overview alert panel. This
closes the most significant data accuracy gap in the current system — memberships
expire silently, MRR figures go stale, and the owner has no way to advance a
billing period without doing a full plan change.

---

## Current State

| Capability                                                        | Status                               |
| ----------------------------------------------------------------- | ------------------------------------ |
| `currentPeriodEndsAt` and `nextBillingDate` stored per membership | ✅ Exists                            |
| Expiring membership alert (7-day monthly, 30-day annual)          | ✅ Exists                            |
| Expired membership visible on member detail                       | ✅ Exists with dedicated state       |
| `addBillingPeriod` helper in `lib/dashboard/billing.ts`           | ✅ Exists                            |
| Renewal server action                                             | ✅ Exists                            |
| "Renew" UI on member detail page                                  | ❌ Missing                           |
| "Renew" action on overview expiring alert                         | ❌ Missing                           |
| Expired membership status and UI distinction                      | ✅ Exists                            |
| MRR accuracy after period ends                                    | ✅ Fixed for current revenue metrics |

---

## Problem Statement

When a membership period ends, nothing happens automatically. The membership
sits at `ACTIVE` with a past `currentPeriodEndsAt`, silently inflating MRR and
masking real churn. The owner sees an expiring alert but has no direct action to
resolve it — the only workaround is "Edit plan", which creates a new membership
and loses the continuity of the current one. There is no UI distinction between
a membership that is expiring soon and one that has already expired.

This defeats the project's core principle that **every piece of data shown must
be actionable**.

---

## Renewal vs Plan Change

These are distinct operations and must stay distinct:

|                        | Renewal                                                     | Plan Change                                              |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| **What it does**       | Advances the current membership period by one billing cycle | Expires current membership, creates a new one            |
| **Plan tier**          | Same plan, same interval                                    | Can change plan and/or interval                          |
| **Membership history** | Same membership record, updated dates                       | New membership record, old one marked EXPIRED            |
| **When to use**        | Member is continuing on the same plan                       | Member is upgrading, downgrading, or switching intervals |
| **Payment created**    | Yes — new PENDING payment for the next period               | Yes — first PENDING payment on the new membership        |

---

## Data Model Behavior

A manual renewal means:

1. Confirm the membership is in a renewable state: `ACTIVE` (expiring soon) or
   `EXPIRED` (period has passed). Memberships that are `PAST_DUE`, `CANCELED`,
   or belong to a `SUSPENDED` member are not renewable through this flow.
2. Advance `currentPeriodEndsAt` forward by one billing period from its current
   value using `addBillingPeriod`. If the membership is already expired (period
   end is in the past), advance from the renewal date instead to avoid creating
   a period that is already over. The renewal date defaults to gym-local today
   and may be backdated.
3. Set `nextBillingDate` to the new `currentPeriodEndsAt`.
4. Set membership `status` to `ACTIVE` if it was `EXPIRED`.
5. Create a new `MembershipPayment` with `status: PENDING`, `dueAt` set to
   the recording date, and `amount` equal to the membership's `priceAmount`.
6. Do not modify `startedAt` — the membership start date reflects when the
   member originally joined this plan.

### Shared definitions

Use these definitions consistently across loaders, display helpers, aggregate
queries, and renewal actions:

- **Renewable membership**: a membership with `status: ACTIVE` or
  `status: EXPIRED` whose member is not `SUSPENDED`.
- **De facto expired membership**: a membership with `status: ACTIVE` and
  `currentPeriodEndsAt` before the gym-local `asOf` day boundary.
- **Current membership for the detail page**: the latest renewable membership,
  ordered by `startedAt desc`, then `id desc`. This intentionally includes
  persisted `EXPIRED` memberships so an owner can renew them from the current
  membership card.
- **Revenue membership**: a membership with `status: ACTIVE` and
  `currentPeriodEndsAt` on or after the gym-local `asOf` day boundary. Stale
  `ACTIVE` memberships do not contribute to MRR or active revenue counts.

### Date boundary rule

Membership periods are stored as dates at UTC midnight, but membership expiry is
a gym-local business-day concept. Normalize every renewal, expiry display, MRR
exclusion, and alert boundary to the start of the gym-local `asOf` day before
comparing against `currentPeriodEndsAt`.

Example: if the gym-local date is `2026-04-19`, a membership ending on
`2026-04-19` is still current for that business day and should not be treated as
expired until the gym-local date advances to `2026-04-20`.

The helper must accept both `asOf` and `gym.timezone`. Do not pass raw
`new Date()` values directly into membership expiry, expiring-window, or revenue
queries. Loaders should derive one canonical `membershipAsOf`/`revenueAsOf`
instant from the gym timezone and pass that value through display helpers,
query scopes, aggregate functions, and server actions.

### Period advancement rule

| Membership state at renewal                           | Advance from                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `ACTIVE` and current through the gym-local `asOf` day | `currentPeriodEndsAt`                                          |
| Persisted `EXPIRED` or de facto expired               | Renewal date (defaults to gym-local today; backdating allowed) |

Advancing from `currentPeriodEndsAt` when the membership is still active
preserves billing alignment (e.g. a member renewing on the 1st always stays
on the 1st). Advancing from the renewal date when the membership has already
expired prevents creating a period that is immediately over.

---

## Constraints

- Keep the existing route model. Renewal actions live on the member detail page
  and the overview alert panel.
- Use Server Components for reads, client components only for interactive
  controls.
- Server actions return `{ success: boolean, error?: string }`.
- Use `revalidatePath` after mutations.
- Validate all inputs with Zod.
- Scope every query through the authenticated owner's gym.
- Reuse `addBillingPeriod` from `lib/dashboard/billing.ts`. Do not duplicate
  billing period logic.
- Reuse a single gym-local day-boundary helper for display helpers, query
  filters, and server action date comparisons.
- Do not add payment processing or gateway integration — renewal creates a
  PENDING payment record only.
- Do not change the plan tier or billing interval — that is "Edit plan".
- Keep mobile-first: 44px touch targets, single-column layout on mobile.

---

## Phase 1: Expired Membership State

Before adding renewal actions, the UI needs to correctly represent the expired
state. Currently a membership with a past `currentPeriodEndsAt` displays no
differently from a current one.

### Data layer

- [x] Add `isExpired(membership, asOf)` to `lib/dashboard/calculations.ts`
  - Returns `true` if `membership.status === "ACTIVE"` and
    `currentPeriodEndsAt` is before the gym-local `asOf` day boundary.
  - An `ACTIVE` membership with a past period end is de facto expired even if
    the status field has not been updated.
  - Keep this as a pure helper — do not mutate the database here.

- [x] Add `getMembershipDisplayStatus(membership, asOf)` to
      `lib/dashboard/calculations.ts`
  - Returns a display-level status: `"active"`, `"expiring"`, `"expired"`,
    `"past_due"`, or `"canceled"`.
  - `"expiring"`: `ACTIVE` + `currentPeriodEndsAt` within renewal window.
  - `"expired"`: `ACTIVE` + `currentPeriodEndsAt` in the past (use `isExpired`).
  - Persisted `EXPIRED` memberships also display as `"expired"`.
  - `"active"`: `ACTIVE` + none of the above.
  - This is a read-only display helper used by the member detail page and roster.

- [x] Add or reuse a gym-local day-boundary helper
  - Accepts a `Date` and `gym.timezone`.
  - Returns the start of that gym-local day as the canonical comparison instant.
  - Use the helper instead of direct full-timestamp comparisons in expired and
    expiring checks.
  - Add tests for a non-UTC timezone such as `Asia/Jakarta`, proving that a
    membership ending on the gym-local date is still current until the next
    gym-local day.

### UI — member detail page

- [x] Update current membership selection on `/members/[id]`
  - Select the latest renewable membership (`ACTIVE` or `EXPIRED`), ordered by
    `startedAt desc`, then `id desc`.
  - Do not show `PAST_DUE` or `CANCELED` memberships as current.
  - This fixes the existing `status === "ACTIVE"` selection, which would hide
    persisted `EXPIRED` memberships from the Renew flow.

- [x] Update the current membership card on `/members/[id]`
  - Add an `"Expired"` badge when `getMembershipDisplayStatus` returns
    `"expired"`.
  - Distinguish visually: `"Expiring soon"` badge in amber, `"Expired"` badge
    in red.
  - Show days remaining for expiring memberships: "Expires in 5 days."
  - Show days overdue for expired memberships: "Expired 12 days ago."

### UI — member roster

- [x] Update the billing risk badge on the member roster row/card
  - Add `"expired"` as a distinct billing risk state alongside `"expiring"` and
    `"overdue"`.
  - Filter bar: add `"Expired"` as a selectable risk filter value.
  - Update `BillingRisk`, `RiskFilter`, and the `validRisks` parser in
    `lib/dashboard/member-roster.ts`.
  - Update roster membership query scopes so the selected membership includes
    renewable `EXPIRED` rows where appropriate. A persisted `EXPIRED`
    membership must not render as "No plan" only because roster queries still
    filter to `ACTIVE`/`PAST_DUE`.
  - Update `getMemberRosterRiskWhere` with an explicit expired-membership branch
    using the same gym-local day boundary as the display helper.

### UI — overview alerts

- [x] Update the expiring membership alert section on the overview page
  - Split into two distinct alert groups:
    - **"Expiring soon"** — memberships within the renewal window, not yet past.
    - **"Expired"** — memberships whose period has already passed.
  - Show each group separately with a clear heading and count.
  - Expired group uses a more urgent visual treatment (red vs amber).
  - Add a distinct `DashboardAlert` type: `EXPIRED_MEMBERSHIP`. Do not infer
    expired state from copy or severity alone.
  - Add `expiredMembershipsCount` to `DashboardSummary`.
  - Add `EXPIRED_MEMBERSHIP` to the `DashboardAlert["type"]` union.
  - Update overview `alertSections`, `openAlertsCount`, and pinned-alert
    filtering so expired alerts are counted and rendered separately.
  - Update the "Expiring subs" summary card or add a second summary signal so
    expired memberships are visible in top-level stats, not only in the alert
    list.

### Verification

- [x] Member with `currentPeriodEndsAt` in the past shows `"Expired"` badge
      on member detail.
- [x] Member with `currentPeriodEndsAt` within renewal window shows
      `"Expiring soon"` badge.
- [x] Member with future period end and no other flags shows `"Active"`.
- [x] Persisted `EXPIRED` membership appears in the current membership card and
      can host the Renew action.
- [x] Overview splits expiring and expired into separate groups.
- [x] Expired overview alerts use the `EXPIRED_MEMBERSHIP` alert type.
- [x] Overview open-alert count includes expired membership alerts.
- [x] `DashboardSummary` exposes an `expiredMembershipsCount` value.
- [x] Roster filter correctly isolates expired members.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 2: Renewal Server Action

### Server action

- [x] Add `renewMembership` to `app/(dashboard)/members/actions.ts`
  - Signature:
    `(values: RenewMembershipValues) => Promise<RenewMembershipActionResult>`
  - Input values:
    - `membershipId: string` — required. The membership to renew.
    - `expectedStatus: "ACTIVE" | "EXPIRED"` — required. The status rendered
      when the renewal dialog was opened.
    - `expectedCurrentPeriodEndsAt: string` — required ISO date string. The
      period end rendered when the renewal dialog was opened.
    - `submissionId: string` — required stable client-generated idempotency key
      for one renewal submit attempt.
    - `renewalDate: string` — optional `YYYY-MM-DD`. Defaults to today. Used
      as the basis for period advancement when the membership is already expired.
      Ignored (advancement uses `currentPeriodEndsAt`) when the membership is
      still active.
  - Validate with Zod.
  - Authenticate via `requireDashboardSession("/members")`.
  - Load the membership by id, scoped to the owner's gym (through the member's
    `gymId` relationship — `Membership` has no direct `gymId`).
  - Reject if membership status is not `ACTIVE` or `EXPIRED`.
  - Reject if the member's status is `SUSPENDED` — suspended members cannot be
    renewed until unsuspended.
  - Determine advance basis:
    - If `status === "ACTIVE"` and `currentPeriodEndsAt` is on or after the
      gym-local day boundary: advance from `currentPeriodEndsAt`.
    - If `status === "EXPIRED"` or `currentPeriodEndsAt` is before the
      gym-local day boundary: advance from `renewalDate` (defaults to
      gym-local today).
  - In a transaction:
    - Re-read the membership by id, still scoped through the member's `gymId`,
      so status and period-end decisions are made against the latest row.
    - Before updating, check whether a payment already exists for this
      `submissionId` using a renewal-specific payment note or metadata field if
      one is added later. If it exists, return `{ success: true }` without
      advancing the membership again.
    - Guard against stale forms and concurrent renewal requests by updating with
      a conditional `where` that includes `expectedStatus` and
      `expectedCurrentPeriodEndsAt`, or by using an equivalent optimistic-
      concurrency check inside the transaction.
    - If the conditional update affects no row and no matching `submissionId`
      payment exists, return a conflict-style error such as "This membership
      changed. Refresh and try again."
    - Compute new `currentPeriodEndsAt` using
      `addBillingPeriod(basis, billingInterval)`.
    - Set `nextBillingDate` to new `currentPeriodEndsAt`.
    - Set `status` to `ACTIVE` if it was `EXPIRED`.
    - Create a `MembershipPayment`: `status: PENDING`, `dueAt` set to the
      recording date, `amount: membership.priceAmount`, with a note that embeds
      the `submissionId` in a parseable format such as
      `Renewal submission: <submissionId>`.
    - Recommended follow-up schema hardening: add a nullable
      `renewalSubmissionId` field to `MembershipPayment` and a unique index on
      `[membershipId, renewalSubmissionId]`. The note-based guard is acceptable
      for v1 if avoiding a migration is more important, but the unique index is
      the stronger long-term duplicate guard.
  - `revalidatePath("/members")`.
  - `revalidatePath("/members/[memberId]")` for the member.
  - `revalidatePath("/subscriptions")` since MRR may change.
  - `revalidatePath("/")` since overview alerts and stats update.

### Validation schema

- [x] Add `renew-membership-schema.ts` in `app/(dashboard)/members/`
  - `membershipId`: non-empty string.
  - `expectedStatus`: enum of `"ACTIVE"` or `"EXPIRED"`.
  - `expectedCurrentPeriodEndsAt`: valid ISO date string.
  - `submissionId`: non-empty UUID or `crypto.randomUUID()`-compatible string.
  - `renewalDate`: optional valid `YYYY-MM-DD` string using `parseDateInput`.
    Must not be a future date. Backdating is allowed for expired memberships.
    The action ignores `renewalDate` for memberships still current through the
    gym-local `asOf` day.
  - Export `renewMembershipSchema`, `RenewMembershipValues`,
    `RenewMembershipActionResult`.

### Verification

- [x] Renewing an `ACTIVE` expiring membership advances period from
      `currentPeriodEndsAt`.
- [x] Renewing an `EXPIRED` membership advances period from the renewal date,
      defaulting to gym-local today.
- [x] Backdating an expired renewal advances the period from the selected
      renewal date while the pending payment due date remains the recording date.
- [x] Renewing an `EXPIRED` membership sets status back to `ACTIVE`.
- [x] Renewal creates a new `PENDING` payment for the correct amount.
- [x] Double-clicking or retrying renewal does not advance two periods or create
      duplicate pending payments.
- [x] Retrying the same `submissionId` after a successful renewal returns
      success without creating another payment or extending another period.
- [x] Concurrent renewals return one success and one conflict-style error.
- [x] Submitting from a stale dialog after the membership changed returns a
      conflict-style error.
- [x] `startedAt` is not modified by renewal.
- [x] Renewal is rejected for `PAST_DUE`, `CANCELED`, `INACTIVE` memberships.
- [x] Renewal is rejected for members with `SUSPENDED` status.
- [x] `renewalDate` in the future is rejected.
- [x] Action is scoped to the owner's gym.
- [x] MRR updates correctly after renewing an expired membership.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 3: Renewal UI on Member Detail Page

### Placement

Add a **"Renew"** button on the current membership card on `/members/[id]`,
visible when `getMembershipDisplayStatus` returns `"expiring"` or `"expired"`.
The button sits alongside the existing "Edit plan" action.

Because the current membership card now includes persisted `EXPIRED`
memberships, the Renew button must be available for both de facto expired
`ACTIVE` rows and rows already marked `EXPIRED`.

### Behavior

- [x] Button opens a confirmation dialog:
  - For expiring memberships:
    _"Renew [Plan Name] ([Interval])? A new billing period will start on
    [currentPeriodEndsAt] and a payment of [amount] will be recorded as
    pending."_
  - For expired memberships:
    _"Renew [Plan Name] ([Interval])? The membership expired [N days ago]. A new
    billing period will start on [renewalDate] and a payment of [amount] will be
    recorded as pending."_
  - For expired memberships, show an optional **renewal date input** (defaults
    to today) so the owner can backdate the renewal if needed.
  - Confirm button: "Renew membership."
  - Cancel button: "Cancel."
  - Generate one `submissionId` when the dialog opens or when the form is
    initialized. Reuse that id for retries of the same submit attempt; generate
    a new id only after the dialog is reopened from freshly rendered membership
    state.
  - Include `expectedStatus` and `expectedCurrentPeriodEndsAt` from the rendered
    membership card in the action payload.
- [x] On success:
  - Dialog closes.
  - Membership card updates: new period end date, `ACTIVE` badge, no expiry
    warning.
  - Payment history section shows the new `PENDING` payment.
  - Success feedback: "Membership renewed. Next period ends [date]."
- [x] On error: show inline error message inside the dialog.
- [x] Disable confirm button while action is pending.
- [x] Keep 44px touch targets on mobile.

### Verification

- [x] "Renew" button appears on the membership card for expiring and expired
      memberships.
- [x] "Renew" button does not appear for active (non-expiring) memberships.
- [x] Confirmation dialog copy reflects expiring vs expired state correctly.
- [x] Expired membership dialog shows the optional renewal date input.
- [x] Persisted `EXPIRED` membership shows the same renewal dialog as a de facto
      expired `ACTIVE` membership.
- [x] If one renewal does not bring a long-expired membership current, show a
      note that another renewal may be needed.
- [x] Renewing updates the membership card dates.
- [x] New PENDING payment appears in payment history.
- [x] Expiring/expired badge clears after successful renewal.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 4: Renewal Action from Overview Alerts

Bridge the gap between seeing the alert and acting on it, consistent with the
approach taken for overdue payments in doc 10.

### Deep link (primary)

- [x] Make each expiring and expired membership alert card on the overview page
      a link to `/members/[memberId]` where the renewal button is visible.
  - The `DashboardAlert` type already carries `memberId`.
  - Add an anchor such as `/members/[memberId]#current-membership` if the
    current membership card is not visible above the fold.
  - Zero new server-side code. Provides a complete resolution path in two taps.

### Inline "Renew" action (stretch goal)

- [x] Render a small **"Renew"** button directly inside each expiring/expired
      alert card on the overview page.
  - Reuses the same `renewMembership` server action.
  - On success: the alert card disappears on the next revalidation and overview
    counts update.
  - On error: show brief inline feedback on the card.
  - Keep the button small — the alert card is already information-dense.
  - Disable while pending.

Deep link is recommended first. The inline action can be layered on after if
owners find the extra navigation step frustrating.

### Verification

- [x] Clicking an expiring alert navigates to the correct member detail page.
- [x] Clicking an expired alert navigates to the correct member detail page.
- [x] Expired alert deep links land near the current membership card or renewal
      action on mobile.
- [ ] (Stretch) Inline "Renew" on the overview resolves the alert.
- [ ] Overview expiring and expired counts decrease after renewal.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 5: Revenue Accuracy Cleanup

Currently, memberships whose period has ended silently inflate MRR because they
remain `ACTIVE` with a past `currentPeriodEndsAt`. The `getMembershipMrr`
aggregate in `lib/dashboard/aggregates.ts` counts all `ACTIVE` memberships,
including stale ones. The subscription summary also counts stale memberships in
its plan breakdown and active revenue setup state.

### Option A: Fix revenue aggregate queries (recommended)

- [x] Update `getMembershipMrr` in `lib/dashboard/aggregates.ts` to exclude
      memberships whose `currentPeriodEndsAt` is before the gym-local `asOf`
      day boundary.
  - Change the function signature to accept a pre-normalized `revenueAsOf`
    instant.
  - Load the gym timezone before calling aggregate functions.
  - Pass the gym-local day-boundary value from `loadOverviewSummary` into
    `getOverviewSummary`, then pass it to `getMembershipMrr`.
  - Apply `currentPeriodEndsAt: { gte: revenueAsOf }` to both monthly and
    annual aggregate queries.
  - This makes MRR reflect only memberships that are currently in an active
    billing period.
  - Requires no schema migration.
  - The membership `status` stays `ACTIVE` until the owner renews or changes
    the plan — the MRR query just stops counting stale ones.

- [x] Update `getSubscriptionSummary` revenue setup state
  - Its `hasActiveRevenueMemberships` query should use the same revenue
    membership definition.
  - Do not count `PAST_DUE` as active revenue. Current revenue counts only
    `ACTIVE` memberships whose period has not ended.
  - Pass the same gym-local `revenueAsOf` from `loadSubscriptionSummary`.

- [x] Update `getPlanBreakdownAggregates`
  - Add a pre-normalized `revenueAsOf` parameter.
  - Count only revenue memberships in the plan breakdown and monthly-equivalent
    revenue totals.
  - Keep historical revenue trend behavior unchanged unless a separate decision
    is made to redefine historical months.

- [x] Replace direct UTC membership-day comparisons in overview and roster
      membership queries
  - `getExpiringMembershipsCount`, `getExpiringMembershipAlerts`, and roster
    risk filters should receive the same gym-local membership boundary.
  - Leave unrelated drop-in daily/monthly revenue windows unchanged unless a
    separate timezone cleanup is explicitly scoped.

```typescript
// Add to the existing ACTIVE membership where clause:
currentPeriodEndsAt: {
  gte: revenueAsOf
}
```

### Option B: Auto-expire stale memberships on read

- Detect and update `status → EXPIRED` when the dashboard loads. Not
  recommended — side effects on reads are unpredictable and hard to test.

### Recommendation

Option A. Update all current revenue aggregate queries with the same revenue
membership definition. No schema migration. No side effects. Combined with
Phase 1's display helpers, expired memberships will be correctly excluded from
current revenue metrics and correctly displayed as expired in the UI.

### Verification

- [x] MRR does not include memberships with `currentPeriodEndsAt` in the past.
- [x] Subscription plan breakdown does not include stale ACTIVE memberships.
- [x] Subscription setup state does not treat stale ACTIVE memberships as active
      revenue memberships.
- [ ] MRR increases after renewing an expired membership.
- [ ] MRR decreases when a membership expires (period end passes) without
      renewal.
- [x] Existing MRR tests updated to cover the `currentPeriodEndsAt` boundary.
- [x] Existing subscription aggregate tests updated to cover the
      `currentPeriodEndsAt` boundary.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Suggested Execution Order

1. **Phase 5 (revenue accuracy)** — highest data accuracy impact, no UI
   dependencies. Do this first.
2. **Phase 1 (expired state)** — pure read path, no mutations. Establishes
   the display helpers that Phase 3 UI depends on.
3. **Phase 2 (server action)** — no UI dependencies. Establishes the write
   path before building UI around it.
4. **Phase 3 (member detail UI)** — depends on Phase 1 (display helpers) and
   Phase 2 (server action).
5. **Phase 4 (overview alert actions)** — depends on Phase 2 for the inline
   stretch goal. Deep links have no dependencies.

Each phase is independently shippable and adds real value.

---

## Decisions

- **Backdating renewals for expired memberships is allowed.** Expired renewal
  uses the selected renewal date as the period advancement basis. The date
  defaults to gym-local today and cannot be in the future.
- **Renewal payment due date stays on the recording date.** Backdating changes
  the renewed membership period, but the newly created `PENDING` payment is due
  on the day the owner records the renewal.
- **Current revenue excludes `PAST_DUE` memberships.** Revenue metrics count
  only `ACTIVE` memberships whose period has not ended. Overdue/payment reports
  represent collection risk separately.
- **No roster renewal action in v1.** Renewal stays on member detail, with
  overview deep links as the fast path from alerts.
- **One renewal adds one billing period.** If a membership expired multiple
  periods ago, the owner renews one period at a time. The UI should note when
  another renewal may be needed to bring the membership current.
- **Retry behavior is idempotent, not another renewal.** A repeated submit with
  the same `submissionId` must return the original success outcome without
  advancing a second period or creating a second payment. If the owner wants to
  renew another period, they should do it as a new explicit action after the page
  reflects the latest membership state.
- **Expired overview alerts use `EXPIRED_MEMBERSHIP`.** This keeps alert
  grouping, styling, and future filtering explicit.

---

## Out of Scope

- Automatic renewal — no background jobs or scheduled tasks in v1.
- Payment gateway integration — renewal creates a PENDING payment record only.
- Bulk renewal (renewing multiple members at once).
- Renewal notifications sent to the member.
- Proration — renewing mid-period always charges the full period amount.
- Renewal discounts or overriding the renewal amount.
- Changing plan tier or billing interval on renewal — that is "Edit plan"
  (doc 06, Phase 3).
