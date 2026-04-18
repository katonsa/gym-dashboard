# Pagination Plan

Status: Pending.

Add pagination to the three unbounded lists that render every row from the database: the member roster, the drop-in log, and the member detail payment/attendance histories.

## Why This Matters

Every list currently loads all rows with `findMany` and no `take` limit. At the brief's target scale of 200 members — each with monthly payments and attendance records — the member detail page alone could render 2,400+ payment rows and 10,000+ attendance rows. The drop-in log grows without bound since it includes anonymous walk-in groups.

## What Gets Paginated

| List | Route | Current behavior | Proposed behavior |
|------|-------|-----------------|-------------------|
| **Member roster** | `/members` | All members loaded server-side, filtered client-side | Server-side offset pagination with client-side search/filter on the current page |
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

### Offset pagination via URL search params

Use `?page=1` query params for pagination state. This keeps the URL shareable and works with Server Components without client state.

**Why offset, not cursor:**
- Lists have stable, human-readable page numbers.
- The data rarely changes between pages during a single session.
- Scale ceiling is 200 members / a few thousand records — offset works fine.
- Cursor pagination is more complex and adds no benefit at this scale.

**Page size:** 25 rows per page for all lists. This fits comfortably on mobile (scrollable) and desktop (one screen).

---

## Implementation

### Shared pagination helper

- [ ] Create `lib/dashboard/pagination.ts`
  - Export a `PaginationParams` type: `{ page: number, pageSize: number }`.
  - Export a `PaginatedResult<T>` type: `{ rows: T[], total: number, page: number, pageSize: number, pageCount: number }`.
  - Export `parsePaginationParams(searchParams, defaults?)` to extract and validate `page` from the Next.js `searchParams` promise. Clamp `page` to >= 1. Default `pageSize` to 25.
  - Export `getPrismaOffsetArgs(params: PaginationParams)` that returns `{ skip: number, take: number }` for Prisma queries.

### Shared pagination UI component

- [ ] Create `components/ui/pagination-nav.tsx`
  - A server-friendly component that renders Previous / page numbers / Next links using `<Link>` with updated `?page=` search params.
  - Props: `page`, `pageCount`, `basePath`, and optionally preserved search params (for filters).
  - Show at most 5 page number links with ellipsis for larger ranges.
  - Hide when `pageCount <= 1`.
  - Keep 44px touch targets.
  - Works on mobile (compact: Previous / "Page X of Y" / Next) and desktop (full page numbers).

---

### Member roster pagination

The member roster is currently a client component (`MemberRoster`) that receives all `MemberRosterRow[]` and filters client-side. Pagination changes the data flow:

**Option A (recommended): Keep client-side filter + paginate the filtered result client-side.**

Since the brief's scale ceiling is 200 members and all members are already loaded for roster building (which needs memberships, payments, and attendance for billing risk calculation), the most practical approach is:

- [ ] Keep loading all members in `loadMembersDashboardData` — the billing risk and filter counts depend on the full set.
- [ ] Add client-side pagination to `MemberRoster` after filtering.
  - Compute `filteredMembers` as today.
  - Slice the filtered list to show only the current page: `filteredMembers.slice(startIndex, endIndex)`.
  - Add pagination controls below the table/card list.
  - Reset to page 1 when any filter changes.
  - Show "Page X of Y" and "N members" in the header.
- [ ] This avoids a server round-trip on every filter change while keeping the roster responsive.

> [!NOTE]
> If the app later supports gyms with 500+ members, revisit with server-side filtering and pagination. For < 200 members, client-side filtering on the full set is the simpler, better UX choice.

**Changes:**

| File | Change |
|------|--------|
| `member-roster.tsx` | Add `currentPage` state, slice `filteredMembers`, render `PaginationNav`, reset page on filter change |

### Drop-in log pagination

The drop-in log displays all visits but the summary stats (daily total, monthly total, frequent visitors) need the full dataset. Split the concern:

- [ ] Keep loading all drop-ins in `loadDropInsDashboardData` for summary calculations.
- [ ] Paginate the display list client-side or server-side.

**Recommended: Server-side pagination for the display list only.**

The drop-in log has no client-side filtering — it just renders all rows newest-first. Paginate at the query level:

- [ ] Add `loadDropInLogPage(gymId, page, pageSize)` to `loaders.ts`
  - Uses `skip` and `take` with `orderBy: visitedAt desc`.
  - Returns `PaginatedResult<DropInVisit>`.
  - Runs alongside the existing full `loadDropInsDashboardData` query (for summary stats).
- [ ] Update `drop-ins/page.tsx`
  - Accept `searchParams` and parse `page`.
  - Pass the paginated rows to the display list.
  - Pass the full drop-ins to summary/frequent visitor calculations (unchanged).
  - Render `PaginationNav` below the log table.

**Changes:**

| File | Change |
|------|--------|
| `lib/dashboard/loaders.ts` | Add `loadDropInLogPage` loader |
| `lib/dashboard/query-scopes.ts` | Add `getDropInVisitsPageQuery(gymId, skip, take)` |
| `app/(dashboard)/drop-ins/page.tsx` | Parse `searchParams.page`, use paginated rows for display, keep full rows for summaries, render pagination controls |

### Member detail payment history pagination

Payments grow linearly with membership duration (one per billing cycle). A member with a 2-year monthly plan has 24 payment rows. Paginate server-side:

- [ ] Add `loadMemberPaymentsPage(gymId, memberId, page, pageSize)` to `loaders.ts`
  - Scoped to the owner's gym.
  - Returns `PaginatedResult<MembershipPayment>`.
- [ ] Update `members/[id]/page.tsx`
  - Accept `searchParams` and parse `page` (or a separate `paymentsPage` param to avoid colliding with attendance pagination).
  - Pass paginated payments to the payment history section.
  - Render `PaginationNav` inside the payment history card.

**Param naming:** Use `pp` (payments page) and `ap` (attendance page) as search param keys to keep URLs short and avoid collision. Example: `/members/abc123?pp=2&ap=3`.

### Member detail attendance log pagination

The attendance log currently loads all records and slices to 20 client-side. Replace with proper server-side pagination:

- [ ] Add `loadMemberAttendancePage(gymId, memberId, page, pageSize)` to `loaders.ts`
  - Scoped to the owner's gym.
  - Returns `PaginatedResult<AttendanceRecord>`.
  - Uses `take: 20` as page size (matches the existing slice).
- [ ] Update `members/[id]/page.tsx`
  - Parse `ap` from search params.
  - Show the total count in the section header: "Attendance log (147)".
  - Render `PaginationNav` inside the attendance card.
  - Remove the manual `.slice(0, 20)`.

---

## Constraints

- Do not paginate data that feeds into aggregate calculations (MRR, alerts, plan breakdown, revenue trend, summary stats).
- Pagination controls must be server-rendered links (`<Link>`), not client-side buttons that trigger fetches. This keeps the pattern consistent with Server Components.
- Exception: the member roster uses client-side pagination since it already has client-side filtering state.
- Keep empty states working — "No drop-ins yet" should still show when the total is zero, not when the current page is empty.
- All pagination links must preserve existing search params (e.g., don't lose `pp=2` when navigating attendance pages).
- Page size is 25 for roster and drop-in log, 20 for attendance (matching the existing slice), 25 for payment history.

## Verification

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Member roster: page through 50+ members with filters active; filter change resets to page 1.
- [ ] Drop-in log: page through 50+ drop-ins; summary stats remain correct across all pages.
- [ ] Member detail payments: page through payment history; page 1 shows the most recent payments.
- [ ] Member detail attendance: page through attendance; total count in header matches full record count.
- [ ] All pagination controls are usable on mobile (44px targets).
- [ ] Page 1 with no `?page=` param shows the same result as `?page=1`.
- [ ] Invalid page values (0, -1, 999, "abc") fall back to page 1 without error.
- [ ] Empty lists show empty states, not pagination controls.

## Suggested execution order

1. `lib/dashboard/pagination.ts` — shared types and helpers.
2. `components/ui/pagination-nav.tsx` — shared UI component.
3. Member roster client-side pagination — simplest, self-contained in one file.
4. Drop-in log server-side pagination — introduces the server-side pattern.
5. Member detail payment + attendance pagination — extends the server-side pattern to a page with two independent pagination controls.

## Out of scope

- Server-side search or filtering (member roster stays client-side).
- Infinite scroll or "load more" patterns — URL-based pagination is simpler and shareable.
- Configurable page size UI — fixed page sizes are sufficient at this scale.
- Paginating the overview or subscriptions pages — their lists are bounded by plan tier count and month count.
