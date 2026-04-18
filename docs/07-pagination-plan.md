# Pagination Plan

Status: Pending.

Add server-side pagination to every unbounded list: the member roster, the drop-in log, and the member detail payment/attendance histories.

## Why This Matters

Every list currently loads all rows with `findMany` and no `take` limit. At the brief's target scale of 200 members — each with monthly payments and attendance records — the member detail page alone could render 2,400+ payment rows and 10,000+ attendance rows. The drop-in log grows without bound since it includes anonymous walk-in groups. If the gym grows past 200 members, loading all members with their memberships, payments, and attendance for roster rendering becomes a real performance problem.

## What Gets Paginated

| List | Route | Current behavior | Proposed behavior |
|------|-------|-----------------|-------------------|
| **Member roster** | `/members` | All members loaded server-side, filtered client-side | Server-side search, filter, and offset pagination |
| **Drop-in log** | `/drop-ins` | All drop-ins loaded, rendered as cards/table | Server-side offset pagination |
| **Payment history** | `/members/[id]` | All payments for that member, rendered as list | Server-side offset pagination |
| **Attendance log** | `/members/[id]` | All records loaded, client sliced to 20 | Server-side offset pagination with correct total count |
| **Membership history** | `/members/[id]` | All memberships for that member | No pagination — a member will have at most a handful of memberships |

## What Must NOT Be Paginated

These loaders feed into aggregate calculations (MRR, alerts, revenue trends, plan breakdown). They must continue loading all rows:

| Loader | Why |
|--------|-----|
| `loadOverviewDashboardData` | Computes MRR, alerts, and summary stats from the full dataset |
| `loadSubscriptionsDashboardData` | Computes plan breakdown and 6-month revenue trend from all memberships and drop-ins |
| Overview drop-in and payment queries | Feed into `getDashboardSummary` and `getDashboardAlerts` |
| Summary stats on `/drop-ins` | Daily total, monthly total, and frequent visitor detection need all current-month rows |

The pagination constraint is: **only paginate the display list, never the calculation inputs.**

---

## Pagination Strategy

### All server-side, offset pagination via URL search params

Use `?page=1` (and filter params like `?status=ACTIVE&plan=Pro`) as query params. This keeps every paginated view shareable, bookmarkable, and consistent with the Server Component architecture.

**Why offset, not cursor:**
- Lists have stable, human-readable page numbers.
- The data rarely changes between pages during a single session.
- Cursor pagination is more complex and adds no benefit at this scale.

**Why server-side for all lists (including member roster):**
- Consistent pattern — one pagination approach across the entire app.
- Scales past 200 members without a rewrite.
- Search and filters become URL-based — shareable, bookmarkable, and survive page refreshes.
- Avoids loading all members, memberships, payments, and attendance just to render 25 rows.
- Billing risk per member can be computed from that member's own data (included via Prisma relations), not by scanning the global payment/membership sets.

**Page size:** 25 rows per page for all lists except attendance (20, matching the existing limit).

---

## Implementation

### Shared pagination helper

- [x] Create `lib/dashboard/pagination.ts`
  - Export a `PaginationParams` type: `{ page: number, pageSize: number }`.
  - Export a `PaginatedResult<T>` type: `{ rows: T[], total: number, page: number, pageSize: number, pageCount: number }`.
  - Export `parsePaginationParams(searchParams, defaults?)` to extract and validate `page` from the Next.js `searchParams` promise. Clamp `page` to >= 1. Default `pageSize` to 25.
  - Export `getPrismaOffsetArgs(params: PaginationParams)` that returns `{ skip: number, take: number }` for Prisma queries.

### Shared pagination UI component

- [x] Create `components/ui/pagination-nav.tsx`
  - A server-friendly component that renders Previous / page numbers / Next links using `<Link>` with updated `?page=` search params.
  - Props: `page`, `pageCount`, `basePath`, and optionally preserved search params (for filters).
  - Show at most 5 page number links with ellipsis for larger ranges.
  - Hide when `pageCount <= 1`.
  - Keep 44px touch targets.
  - Works on mobile (compact: Previous / "Page X of Y" / Next) and desktop (full page numbers).

---

### Member roster pagination

The member roster is currently a client component (`MemberRoster`) that receives all `MemberRosterRow[]` and filters/searches client-side. This section converts it to server-side search, filter, and pagination.

#### Move filters to URL search params

The roster currently uses React state for search query, status filter, plan filter, and billing risk filter. Move all of these to URL search params so the server can apply them at the Prisma level:

| Current client state | New URL param | Values |
|---------------------|---------------|--------|
| `query` (text search) | `q` | Free text |
| `status` filter | `status` | `all`, `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `plan` filter | `plan` | `all`, or a plan tier name |
| `risk` filter | `risk` | `all`, `overdue`, `expiring`, `clear` |
| (new) page | `page` | Integer >= 1 |

#### Compute billing risk per-member at query time

The current `buildMemberRosterRows` computes billing risk by scanning ALL payments and ALL memberships to build `overdueMemberIds` and `expiringMemberIds` Sets, then checking each member against those Sets.

Replace this with a per-member approach:

- [x] Add a `loadMemberRosterPage` loader that includes each member's relevant data:
  - Include the member's active/latest membership (via `member.memberships` with `take: 1, orderBy: startedAt desc, where: status in [ACTIVE, PAST_DUE]`).
  - Include the membership's plan tier (for plan name and billing interval display).
  - Include the member's overdue/pending-past-due payment count (via a filtered `_count` or a subquery).
  - Include the member's attendance count (via `_count` on `attendanceRecords`).
  - Compute `billingRisk` from the per-member included data:
    - `overdue`: member has at least one payment with `status = OVERDUE` or `status = PENDING AND dueAt < now`.
    - `expiring`: member's active membership `currentPeriodEndsAt` is within the renewal window (7 days for monthly, 30 days for annual).
    - `clear`: neither of the above.

#### Apply filters at the Prisma level

- [x] Build `WHERE` clauses from URL params:
  - `q` → `OR: [{ firstName: { contains: q, mode: insensitive } }, { lastName: { contains: q, mode: insensitive } }, { email: { contains: q, mode: insensitive } }, { phone: { contains: q, mode: insensitive } }]`
  - `status` → `status: { equals: status }` (skip if `all`)
  - `plan` → filter through membership relation: `memberships: { some: { planTier: { name: plan }, status: { in: ['ACTIVE', 'PAST_DUE'] } } }`. Members with "No plan" can be filtered with `memberships: { none: { status: { in: ['ACTIVE', 'PAST_DUE'] } } }`.
  - `risk` → this is the trickiest filter. Options:
    - For `overdue`: `payments: { some: { OR: [{ status: OVERDUE }, { status: PENDING, dueAt: { lt: now } }] } }`.
    - For `expiring`: filter through membership where `status = ACTIVE AND currentPeriodEndsAt` is within the window. This requires computing the window boundary date and filtering `currentPeriodEndsAt: { gte: now, lte: windowEnd }`.
    - For `clear`: negate both overdue and expiring conditions.

- [x] Get `total` count with `db.member.count()` using the same `WHERE` clause (without `skip`/`take`).

#### Convert MemberRoster from client filter state to URL-driven

- [x] Convert `MemberRoster` from managing filter state internally to reading/writing URL search params:
  - Replace `useState` for filters with values parsed from props (passed down from the server component).
  - Filter inputs (search box, dropdowns) submit via form `GET` to the same page with updated search params, or use `useRouter().push` with new params.
  - The "Reset" button clears all search params.
  - Each filter change resets `page` to 1.
  - The component receives the pre-filtered, pre-paginated `MemberRosterRow[]` from the server — no client-side filtering needed.

- [x] Keep the filter UI interactive:
  - Use a lightweight client component for the filter bar that constructs URLs and navigates.
  - The data list itself can be a server component receiving the already-paginated rows.
  - Or keep `MemberRoster` as a client component but have it receive only the current page of rows.

#### Visible member count

- [x] The header currently shows "Visible members: X of Y". Adjust to:
  - "X of Y" where X = total matching the current filters (from `count` query), Y = total members in the gym.
  - The total gym member count can be a simple `db.member.count({ where: { gymId } })`.

**Changes:**

| File | Change |
|------|--------|
| `lib/dashboard/loaders.ts` | Add `loadMemberRosterPage(gymId, filters, pagination)` |
| `lib/dashboard/query-scopes.ts` | Add `getMemberRosterPageQuery(gymId, filters, skip, take)` |
| `lib/dashboard/member-roster.ts` | Simplify or replace `buildMemberRosterRows` — billing risk comes from per-member included data, not global Sets |
| `app/(dashboard)/members/page.tsx` | Parse search params, call paginated loader, pass results to roster |
| `app/(dashboard)/members/member-roster.tsx` | Remove client-side filter state; read filters from props; render pagination; filter changes navigate via URL |

---

### Drop-in log pagination

The drop-in log displays all visits but the summary stats (daily total, monthly total, frequent visitors) need the full dataset. Split the concern:

- [x] Keep loading all drop-ins in `loadDropInsDashboardData` for summary calculations.
- [x] Add a separate paginated query for the display list.

The drop-in log has no filtering — it renders all rows newest-first. Paginate at the query level:

- [x] Add `loadDropInLogPage(gymId, page, pageSize)` to `loaders.ts`
  - Uses `skip` and `take` with `orderBy: visitedAt desc`.
  - Returns `PaginatedResult<DropInVisit>`.
  - Runs alongside the existing full `loadDropInsDashboardData` query (for summary stats).
- [x] Update `drop-ins/page.tsx`
  - Accept `searchParams` and parse `page`.
  - Pass the paginated rows to the display list.
  - Pass the full drop-ins to summary/frequent visitor calculations (unchanged).
  - Render `PaginationNav` below the log table.

> [!NOTE]
> The drop-ins page runs two queries: one full load for summaries and one paginated for display. This is acceptable because the summary query is a read-only scan for aggregation, while the display query is bounded by `take: 25`. If drop-in volume grows very large (10k+), consider replacing the full summary query with database-level aggregates (`SUM`, `COUNT`, `GROUP BY`) instead of loading all rows.

**Changes:**

| File | Change |
|------|--------|
| `lib/dashboard/loaders.ts` | Add `loadDropInLogPage` loader |
| `lib/dashboard/query-scopes.ts` | Add `getDropInVisitsPageQuery(gymId, skip, take)` |
| `app/(dashboard)/drop-ins/page.tsx` | Parse `searchParams.page`, use paginated rows for display, keep full rows for summaries, render pagination controls |

---

### Member detail payment history pagination

Payments grow linearly with membership duration (one per billing cycle). Paginate server-side:

- [x] Add `loadMemberPaymentsPage(gymId, memberId, page, pageSize)` to `loaders.ts`
  - Scoped to the owner's gym.
  - Returns `PaginatedResult<MembershipPayment>`.
- [x] Update `members/[id]/page.tsx`
  - Accept `searchParams` and parse separate pagination params.
  - Pass paginated payments to the payment history section.
  - Render `PaginationNav` inside the payment history card.

**Param naming:** Use `pp` (payments page) and `ap` (attendance page) as search param keys to keep URLs short and avoid collision. Example: `/members/abc123?pp=2&ap=3`.

### Member detail attendance log pagination

The attendance log currently loads all records and slices to 20 client-side. Replace with proper server-side pagination:

- [x] Add `loadMemberAttendancePage(gymId, memberId, page, pageSize)` to `loaders.ts`
  - Scoped to the owner's gym.
  - Returns `PaginatedResult<AttendanceRecord>`.
  - Uses `take: 20` as page size (matches the existing slice).
- [x] Update `members/[id]/page.tsx`
  - Parse `ap` from search params.
  - Show the total count in the section header: "Attendance log (147)".
  - Render `PaginationNav` inside the attendance card.
  - Remove the manual `.slice(0, 20)`.

---

## Constraints

- Do not paginate data that feeds into aggregate calculations (MRR, alerts, plan breakdown, revenue trend, summary stats).
- All pagination uses server-side queries with `skip`/`take` at the Prisma level.
- Pagination controls are server-rendered links (`<Link>`), not client-side buttons.
- Member roster search and filters are URL search params, not client state: `?q=John&status=ACTIVE&plan=Pro&risk=overdue&page=2`.
- Filter changes always reset `page` to 1.
- Keep empty states working — "No members yet" should show when the total is zero, not when the current page is empty.
- All pagination links must preserve other search params (e.g., don't lose `pp=2` when navigating attendance pages, don't lose `q=John` when navigating roster pages).
- Page size is 25 for roster, drop-in log, and payment history; 20 for attendance.

## Verification

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Member roster: page through members with filters active; filter change resets to page 1; search works via URL; billing risk badges are correct per-member.
- [ ] Member roster: bookmark a filtered + paginated URL, reload — same results appear.
- [ ] Drop-in log: page through drop-ins; summary stats remain correct across all pages.
- [ ] Member detail payments: page through payment history; page 1 shows the most recent payments.
- [ ] Member detail attendance: page through attendance; total count in header matches full record count.
- [ ] All pagination controls are usable on mobile (44px targets).
- [ ] Page 1 with no `?page=` param shows the same result as `?page=1`.
- [ ] Invalid page values (0, -1, 999, "abc") fall back to page 1 without error.
- [ ] Empty lists show empty states, not pagination controls.

## Suggested execution order

1. `lib/dashboard/pagination.ts` — shared types and helpers.
2. `components/ui/pagination-nav.tsx` — shared UI component.
3. Drop-in log server-side pagination — cleanest case, no filters, establishes the server-side pattern.
4. Member detail payment + attendance pagination — extends the pattern to a page with two independent pagination params.
5. Member roster server-side pagination — most complex (filters, search, billing risk refactor), done last with the established patterns.

## Out of scope

- Infinite scroll or "load more" patterns — URL-based pagination is simpler and shareable.
- Configurable page size UI — fixed page sizes are sufficient.
- Paginating the overview or subscriptions pages — their lists are bounded by plan tier count and month count.
- Replacing summary aggregations with database-level `SUM`/`COUNT` — acceptable optimization for the future but not needed at current scale.
