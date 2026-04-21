# Database Aggregation Plan

Status: Runtime summary aggregation complete.

Replace the in-memory JavaScript aggregation functions with database-level
queries (`COUNT`, `SUM`, `GROUP BY`). The overview, subscriptions, and drop-ins
summary paths now use database aggregates. A few pure member roster/detail
helpers remain in `calculations.ts` until the remaining member-page cleanup is
handled.

## Current Situation

Every summary statistic on the overview, subscriptions, and drop-ins pages is computed by:

1. Loading **all** rows of the relevant table(s) into memory via `findMany`.
2. Running `.reduce()`, `.filter()`, or `Map` accumulation in JavaScript.

This runs on every page load (the loaders use `react cache()` for request dedup, but the cache is per-request — no persistence across users or page navigations).

### Original row-loading problem

| Page             | Tables loaded entirely                     | Rows at 200 members × 2 years                     |
| ---------------- | ------------------------------------------ | ------------------------------------------------- |
| `/` overview     | members, memberships, payments, drop-ins   | ~200 + ~200 + ~4,800 + ~2,000 = **~7,200 rows**   |
| `/subscriptions` | planTiers, memberships, payments, drop-ins | ~5 + ~200 + ~4,800 + ~2,000 = **~7,000 rows**     |
| `/drop-ins`      | drop-ins                                   | **~2,000 rows**                                   |
| `/members`       | members, memberships, payments, attendance | ~200 + ~200 + ~4,800 + ~20,000 = **~25,200 rows** |

Most of this data is loaded only to produce a handful of numbers (MRR, counts, sums).

---

## Aggregation Inventory

Each item below maps a current JS function to the database query that should replace it. The items are grouped by consuming page.

### Overview page (`/`)

The overview page used to call `getDashboardSummary` and `getDashboardAlerts`,
which internally called every calculation function. It now calls
`loadOverviewSummary` and `loadOverviewAlerts`, backed by `aggregates.ts`.

#### 1. Member counts by status

**Current:** `getMemberCounts(members)` — reduces ALL members array.  
**Replace with:**

```sql
SELECT status, COUNT(*) as count
FROM "Member"
WHERE "gymId" = $gymId
GROUP BY status
```

**Prisma:**

```ts
db.member.groupBy({
  by: ["status"],
  where: { gymId },
  _count: { _all: true },
})
```

**Returns:** `{ ACTIVE: n, INACTIVE: n, SUSPENDED: n }` → derive `totalMembers` as sum.

---

#### 2. New sign-ups this month

**Current:** `getNewSignUpsThisMonth(members, asOf)` — filters ALL members by `joinDate` in same month.  
**Replace with:**

```sql
SELECT COUNT(*) FROM "Member"
WHERE "gymId" = $gymId
  AND "joinDate" >= $monthStart
  AND "joinDate" < $nextMonthStart
```

**Prisma:**

```ts
db.member.count({
  where: {
    gymId,
    joinDate: { gte: monthStart, lt: nextMonthStart },
  },
})
```

---

#### 3. Membership MRR

**Current:** `calculateMembershipMrr(memberships)` — reduces ALL memberships, summing `priceAmount` for ACTIVE ones (dividing annual by 12).  
**Replace with:**

```sql
SELECT
  SUM(CASE WHEN "billingInterval" = 'ANNUAL'
    THEN "priceAmount" / 12
    ELSE "priceAmount"
  END) as mrr
FROM "Membership"
WHERE "memberId" IN (SELECT id FROM "Member" WHERE "gymId" = $gymId)
  AND "status" = 'ACTIVE'
```

**Prisma:** Prisma's `aggregate` doesn't support `CASE` expressions. Options:

- **Option A:** Use `$queryRaw` for this specific query.
- **Option B:** Run two `aggregate` queries (one for MONTHLY, one for ANNUAL) and combine:

```ts
const [monthly, annual] = await Promise.all([
  db.membership.aggregate({
    where: { member: { gymId }, status: "ACTIVE", billingInterval: "MONTHLY" },
    _sum: { priceAmount: true },
  }),
  db.membership.aggregate({
    where: { member: { gymId }, status: "ACTIVE", billingInterval: "ANNUAL" },
    _sum: { priceAmount: true },
  }),
])
const mrr =
  (monthly._sum.priceAmount ?? 0) + (annual._sum.priceAmount ?? 0) / 12
```

Option B is recommended — avoids raw SQL, two simple queries.

---

#### 4. Drop-in revenue this month

**Current:** `calculateDropInRevenueForMonth(dropIns, asOf)` — reduces ALL drop-ins, summing `amount` where `visitedAt` is in same month.  
**Replace with:**

```sql
SELECT COALESCE(SUM("amount"), 0) as total
FROM "DropInVisit"
WHERE "gymId" = $gymId
  AND "visitedAt" >= $monthStart
  AND "visitedAt" < $nextMonthStart
```

**Prisma:**

```ts
db.dropInVisit.aggregate({
  where: {
    gymId,
    visitedAt: { gte: monthStart, lt: nextMonthStart },
  },
  _sum: { amount: true },
})
```

---

#### 5. Expiring memberships count

**Current:** `getExpiringMemberships(memberships, options)` — filters ALL memberships for ACTIVE + `currentPeriodEndsAt` within window.  
**Replace with:**

```sql
SELECT COUNT(*) FROM "Membership"
WHERE "memberId" IN (SELECT id FROM "Member" WHERE "gymId" = $gymId)
  AND "status" = 'ACTIVE'
  AND "currentPeriodEndsAt" >= $now
  AND (
    ("billingInterval" = 'MONTHLY' AND "currentPeriodEndsAt" <= $now + 7 days)
    OR
    ("billingInterval" = 'ANNUAL' AND "currentPeriodEndsAt" <= $now + 30 days)
  )
```

**Prisma:** Two separate count queries (monthly window and annual window) then sum:

```ts
const [monthlyExpiring, annualExpiring] = await Promise.all([
  db.membership.count({
    where: {
      member: { gymId },
      status: "ACTIVE",
      billingInterval: "MONTHLY",
      currentPeriodEndsAt: { gte: now, lte: monthlyWindowEnd },
    },
  }),
  db.membership.count({
    where: {
      member: { gymId },
      status: "ACTIVE",
      billingInterval: "ANNUAL",
      currentPeriodEndsAt: { gte: now, lte: annualWindowEnd },
    },
  }),
])
```

---

#### 6. Overdue payments count

**Current:** `getOverduePayments(payments, asOf)` — filters ALL payments for `OVERDUE` or `PENDING + past due`.  
**Replace with:**

```sql
SELECT COUNT(*) FROM "MembershipPayment"
WHERE "gymId" = $gymId
  AND ("status" = 'OVERDUE' OR ("status" = 'PENDING' AND "dueAt" < $now))
```

**Prisma:**

```ts
db.membershipPayment.count({
  where: {
    gymId,
    OR: [{ status: "OVERDUE" }, { status: "PENDING", dueAt: { lt: now } }],
  },
})
```

Uses the existing `@@index([gymId, status, dueAt])` index.

---

#### 7. Inactive members count

**Current:** `getInactiveMembers(members, options)` — filters ALL members for `INACTIVE` status + `lastAttendedAt` older than 30 days (or null).  
**Replace with:**

```sql
SELECT COUNT(*) FROM "Member"
WHERE "gymId" = $gymId
  AND "status" = 'INACTIVE'
  AND ("lastAttendedAt" IS NULL OR "lastAttendedAt" <= $cutoffDate)
```

**Prisma:**

```ts
db.member.count({
  where: {
    gymId,
    status: "INACTIVE",
    OR: [{ lastAttendedAt: null }, { lastAttendedAt: { lte: inactiveCutoff } }],
  },
})
```

Uses the existing `@@index([gymId, status])` and `@@index([gymId, lastAttendedAt])` indexes.

---

#### 8. Drop-in conversion opportunities count

**Current:** `getDropInConversionOpportunities(dropIns, options)` — groups ALL current-month drop-ins by `visitorContact`, sums `visitCount`, filters ≥ 5.  
**Replace with:**

```sql
SELECT COUNT(*) FROM (
  SELECT "visitorContact"
  FROM "DropInVisit"
  WHERE "gymId" = $gymId
    AND "visitedAt" >= $monthStart
    AND "visitedAt" < $nextMonthStart
    AND "visitorName" IS NOT NULL
    AND "visitorContact" IS NOT NULL
  GROUP BY "visitorContact"
  HAVING SUM("visitCount") >= 5
) as conversion_leads
```

**Prisma:** Prisma doesn't support `HAVING`. Options:

- **Option A (recommended for count only):** Use `$queryRaw` for the count.
- **Option B:** Use `groupBy` + filter in JS (smaller dataset since it's already scoped to current month + identified visitors).

For the overview page, only the **count** is needed — use `$queryRaw`:

```ts
const [{ count }] = await db.$queryRaw<[{ count: bigint }]>`
  SELECT COUNT(*)::int as count FROM (
    SELECT "visitorContact"
    FROM "DropInVisit"
    WHERE "gymId" = ${gymId}
      AND "visitedAt" >= ${monthStart}
      AND "visitedAt" < ${nextMonthStart}
      AND "visitorName" IS NOT NULL
      AND "visitorContact" IS NOT NULL
    GROUP BY "visitorContact"
    HAVING SUM("visitCount") >= 5
  ) as leads
`
```

---

### Overview page — alerts (detail rows)

The alert list on the overview page needs **the actual rows** (member name, due date, amount) — not just counts. However, it only needs a bounded number of alerts (the UI shows them as a scrollable list).

- [ ] For expiring memberships alerts: load only the matching rows (same WHERE as the count query above) with member name joined. Add `take: 50` to cap the result.
- [ ] For overdue payment alerts: same — load matching rows with member name, `take: 50`.
- [ ] For inactive member alerts: load matching rows, `take: 50`.
- [ ] For conversion opportunity alerts: use `$queryRaw` with `GROUP BY` + `HAVING`, `LIMIT 50`.

This replaces loading ALL rows and filtering in JS.

---

### Subscriptions page (`/subscriptions`)

#### 9. Plan breakdown (members per tier, revenue per tier)

**Current:** `getPlanBreakdown(data)` — iterates ALL memberships per plan tier, counts and sums.  
**Replace with:**

```sql
SELECT
  "planTierId",
  COUNT(*) as member_count,
  COUNT(*) FILTER (WHERE "billingInterval" = 'MONTHLY') as monthly_count,
  COUNT(*) FILTER (WHERE "billingInterval" = 'ANNUAL') as annual_count,
  SUM(CASE WHEN "billingInterval" = 'ANNUAL'
    THEN "priceAmount" / 12
    ELSE "priceAmount"
  END) as monthly_equivalent_revenue
FROM "Membership"
WHERE "memberId" IN (SELECT id FROM "Member" WHERE "gymId" = $gymId)
  AND "status" IN ('ACTIVE', 'PAST_DUE')
GROUP BY "planTierId"
```

**Prisma:** Use `groupBy` for counts, `$queryRaw` for the CASE revenue:

```ts
// Counts via groupBy
const membershipCounts = await db.membership.groupBy({
  by: ["planTierId", "billingInterval"],
  where: {
    member: { gymId },
    status: { in: ["ACTIVE", "PAST_DUE"] },
  },
  _count: { _all: true },
})

// Revenue via raw query (CASE not supported in Prisma aggregate)
const revenueByPlan = await db.$queryRaw<
  { planTierId: string; revenue: number }[]
>`
  SELECT "planTierId",
    SUM(CASE WHEN "billingInterval" = 'ANNUAL'
      THEN "priceAmount" / 12.0
      ELSE "priceAmount"
    END)::int as revenue
  FROM "Membership"
  WHERE "memberId" IN (SELECT id FROM "Member" WHERE "gymId" = ${gymId})
    AND "status" IN ('ACTIVE', 'PAST_DUE')
  GROUP BY "planTierId"
`
```

Plan tier names and descriptions are still loaded via the existing `getPlanTiersQuery` (small fixed-size table).

---

#### 10. Six-month revenue trend

**Current:** `getRevenueTrend(data, currentMonth)` — for each of 6 months, iterates ALL memberships to check if they were live during that month, then iterates ALL drop-ins for that month.  
**Replace with:**

**Membership revenue per month** — this is the trickiest because it checks whether a membership was "live" during a month (overlaps the month window). Use `$queryRaw`:

```sql
SELECT
  date_trunc('month', month_series) as month,
  COALESCE(SUM(
    CASE WHEN "billingInterval" = 'ANNUAL'
      THEN "priceAmount" / 12.0
      ELSE "priceAmount"
    END
  ), 0) as membership_revenue
FROM generate_series($startMonth, $endMonth, interval '1 month') as month_series
LEFT JOIN "Membership" m ON
  m."memberId" IN (SELECT id FROM "Member" WHERE "gymId" = $gymId)
  AND m."startedAt" <= (month_series + interval '1 month' - interval '1 day')
  AND COALESCE(m."canceledAt", m."currentPeriodEndsAt") >= month_series
GROUP BY month
ORDER BY month
```

**Drop-in revenue per month:**

```sql
SELECT
  date_trunc('month', "visitedAt") as month,
  COALESCE(SUM("amount"), 0) as drop_in_revenue
FROM "DropInVisit"
WHERE "gymId" = $gymId
  AND "visitedAt" >= $startMonth
  AND "visitedAt" < $endMonth
GROUP BY month
ORDER BY month
```

**Prisma:** Both require `$queryRaw` due to `generate_series`, `date_trunc`, and `CASE`.

---

### Drop-ins page (`/drop-ins`)

#### 11. Daily drop-in total

**Current:** `getDropInsForDay` + `sumDropInAmount` — filters ALL drop-ins for today, then sums.  
**Replace with:**

```ts
db.dropInVisit.aggregate({
  where: {
    gymId,
    visitedAt: { gte: dayStart, lt: nextDayStart },
  },
  _sum: { amount: true, visitCount: true },
})
```

Single query returns both the revenue and visit count for today.

---

#### 12. Monthly drop-in total

**Current:** `getDropInsForMonth` + `sumDropInAmount` — filters ALL drop-ins for this month, then sums.  
**Replace with:**

```ts
db.dropInVisit.aggregate({
  where: {
    gymId,
    visitedAt: { gte: monthStart, lt: nextMonthStart },
  },
  _sum: { amount: true, visitCount: true },
})
```

> [!NOTE]
> Items 11 and 12 can be combined with item 4 (overview drop-in revenue) since they use the same pattern with different date ranges.

---

#### 13. Frequent visitor / conversion opportunities (full list)

**Current:** `getDropInConversionOpportunities` — groups ALL drop-ins by contact, filters ≥ 5.  
**Replace with:** The drop-ins page shows the **full list** of conversion leads (not just the count). Use `$queryRaw`:

```sql
SELECT "visitorName", "visitorContact",
  SUM("visitCount")::int as visit_count,
  SUM("amount")::int as revenue_amount
FROM "DropInVisit"
WHERE "gymId" = $gymId
  AND "visitedAt" >= $monthStart
  AND "visitedAt" < $nextMonthStart
  AND "visitorName" IS NOT NULL
  AND "visitorContact" IS NOT NULL
GROUP BY "visitorContact", "visitorName"
HAVING SUM("visitCount") >= 5
ORDER BY visit_count DESC
```

This replaces loading all drop-ins into JS and grouping them with a `Map`.

---

## Implementation Approach

### New loader: `loadOverviewSummary`

- [x] Create a new function in `lib/dashboard/loaders.ts` that runs all the overview aggregate queries in parallel via `Promise.all` and returns a `DashboardSummary` directly — without constructing a `DashboardData` object.
- [x] This replaces the old flow of `loadOverviewDashboardData` → build `DashboardData` → `getDashboardSummary(data)`.
- [x] The overview page calls `loadOverviewSummary()` for stats and a separate `loadOverviewAlerts()` for the alert row list.

### New loader: `loadOverviewAlerts`

- [x] Runs the bounded row-level queries (expiring memberships, overdue payments, inactive members, conversion leads) with member names joined and `take: 50`.
- [x] Returns `DashboardAlert[]` directly.
- [x] Replaces `getDashboardAlerts(data)`.

### New loader: `loadSubscriptionSummary`

- [x] Runs the plan breakdown and revenue trend queries.
- [x] Returns the structured breakdown and trend data.
- [x] Replaces loading all memberships/payments/drop-ins to compute `getPlanBreakdown` and `getRevenueTrend`.
- [x] Plan tiers are still loaded via the existing query (small table).

### New loader: `loadDropInSummary`

- [x] Runs the daily total, monthly total, and conversion opportunities queries in parallel.
- [x] Returns the summary stats.
- [x] The paginated drop-in log page query (from the pagination plan) runs alongside this.

### New file: `lib/dashboard/aggregates.ts`

- [x] Extract all aggregation query functions into a dedicated module:
  - `getMemberCountsByStatus(gymId)`
  - `getNewSignUpsThisMonth(gymId, monthStart, nextMonthStart)`
  - `getMembershipMrr(gymId)`
  - `getDropInRevenue(gymId, startDate, endDate)`
  - `getExpiringMembershipsCount(gymId, now, monthlyWindowEnd, annualWindowEnd)`
  - `getOverduePaymentsCount(gymId, now)`
  - `getInactiveMembersCount(gymId, inactiveCutoff)`
  - `getConversionLeadsCount(gymId, monthStart, nextMonthStart, threshold)`
  - `getConversionLeads(gymId, monthStart, nextMonthStart, threshold)`
  - `getPlanBreakdownAggregates(gymId)`
  - `getRevenueTrend(gymId, startMonth, endMonth)`
  - `getDropInDailyTotal(gymId, dayStart, nextDayStart)`
  - `getDropInMonthlyTotal(gymId, monthStart, nextMonthStart)`
- [x] Each function receives primitive IDs and dates — no dependency on `DashboardData`.
- [x] Each function calls Prisma directly (either typed queries or `$queryRaw`).

---

## What Happens to `calculations.ts`

The current `calculations.ts` contains two kinds of functions:

1. **Aggregation functions** (counts, sums, grouping) — these move to `aggregates.ts` as database queries.
2. **Pure logic** still used by non-aggregate page behavior can stay.

After migration:

| Function                           | Destination                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `getMemberCounts`                  | → `aggregates.ts` (db `groupBy`)                                                  |
| `calculateMembershipMrr`           | → `aggregates.ts` (db `aggregate`)                                                |
| `calculateDropInRevenueForMonth`   | → `aggregates.ts` (db `aggregate`)                                                |
| `calculateTotalRevenueForMonth`    | → removed (derived from two aggregates)                                           |
| `getExpiringMemberships`           | → `aggregates.ts` (db `count` for overview; db `findMany` with `take` for alerts) |
| `getOverduePayments`               | → `aggregates.ts` (db `count` for overview; db `findMany` with `take` for alerts) |
| `getInactiveMembers`               | → `aggregates.ts` (db `count` for overview; db `findMany` with `take` for alerts) |
| `getDropInConversionOpportunities` | → `aggregates.ts` (db `$queryRaw`)                                                |
| `getNewSignUpsThisMonth`           | → `aggregates.ts` (db `count`)                                                    |
| `getMembersWithMemberships`        | → removed (roster uses per-member includes from pagination plan)                  |
| `getDashboardSummary`              | → becomes `loadOverviewSummary` (calls aggregates)                                |
| `getDashboardAlerts`               | → becomes `loadOverviewAlerts` (calls bounded queries)                            |

`calculations.ts` is now much thinner. It keeps the pure helper still consumed
by the member detail path:

- `getExpiringMemberships`

The old pure JS summary aggregation helpers and their tests were removed.
Aggregate query behavior is covered by mock/query-shape tests in
`dashboard-aggregates.test.ts`.

---

## What Happens to `DashboardData`

The `DashboardData` type was designed as a "load everything into a bag, then compute" pattern. After this migration:

- The **overview page** no longer builds a `DashboardData` — it calls `loadOverviewSummary` and `loadOverviewAlerts` directly.
- The **subscriptions page** no longer builds a `SubscriptionsDashboardData` with all memberships/payments/dropIns — it calls `loadSubscriptionSummary` directly.
- The **drop-ins page** no longer loads all drop-ins for summaries — it calls `loadDropInSummary` directly.
- The **members page** uses server-side roster pagination and no longer builds a full `DashboardData` bag.

`DashboardData` was removed after the pagination cleanup.

> [!IMPORTANT]
> This plan and the pagination plan (doc 07) are complementary but independent. Either can be done first. If pagination is done first, the overview/subscriptions pages still load all data for summaries (acceptable for now). If aggregates are done first, the display lists still load all rows for rendering (acceptable for now). Doing both eliminates all unbounded full-table loads.

---

## Constraints

- Use `$queryRaw` only when Prisma's typed API can't express the query (CASE, HAVING, generate_series). Always use tagged template literals to prevent SQL injection.
- All raw queries must scope by `gymId` — maintain owner isolation.
- Keep existing tests passing during migration. The aggregate functions are tested with mocked Prisma/query clients rather than a test database.
- MRR calculation must produce the same results: `priceAmount / 12` for annual, `priceAmount` for monthly. Use `/ 12.0` in SQL to match JS float division.
- Date boundaries currently preserve the existing UTC behavior. A future fix can use the gym's `timezone` field to move same-day and same-month boundaries to the gym-local timezone.

## Indexes

The existing schema indexes should cover most queries:

| Query                                     | Covered by                                                      |
| ----------------------------------------- | --------------------------------------------------------------- |
| Member count by status                    | `@@index([gymId, status])`                                      |
| New sign-ups this month                   | `@@index([gymId, joinDate])`                                    |
| MRR (membership sum by status + interval) | `@@index([status, nextBillingDate])` via member join            |
| Expiring memberships                      | `@@index([status, currentPeriodEndsAt])`                        |
| Overdue payments                          | `@@index([gymId, status, dueAt])`                               |
| Inactive members                          | `@@index([gymId, status])` + `@@index([gymId, lastAttendedAt])` |
| Drop-in sums by date                      | `@@index([gymId, visitedAt])`                                   |
| Conversion leads (GROUP BY contact)       | `@@index([gymId, visitorContact, visitedAt])`                   |
| Revenue trend (membership overlap)        | `@@index([status, currentPeriodEndsAt])` (may need additional)  |
| Plan breakdown (GROUP BY planTierId)      | `@@index([planTierId, status])`                                 |

No new indexes are expected to be needed. Monitor with `EXPLAIN ANALYZE` after implementation.

## Verification

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] Overview page: summary stats were verified against the previous JS-based computation before removing the old code path.
- [x] Overview alerts: alert counts and bounded alert queries were verified during the development comparison pass.
- [x] Subscriptions: plan breakdown numbers and revenue trend are database-backed and covered by aggregate tests.
- [x] Drop-in summary: daily total, monthly total, and conversion leads are database-backed and covered by aggregate tests.
- [x] Existing tests pass or are updated to test the new aggregate functions.
- [x] Raw SQL queries use parameterized templates (`${}` in tagged template), no string concatenation.
- [x] All queries scope by gymId.

## Suggested execution order

1. [x] `lib/dashboard/aggregates.ts` — create the module and implement the simpler Prisma queries first (member counts, new sign-ups, overdue count, inactive count).
2. [x] Overview summary loader — wire the simple aggregates into `loadOverviewSummary`, verify against the old `getDashboardSummary`.
3. [x] MRR and drop-in revenue aggregates — add the two-query MRR pattern and the drop-in aggregate.
4. [x] Expiring memberships count — add the two-window count query.
5. [x] Conversion leads — add the `$queryRaw` with GROUP BY/HAVING.
6. [x] Overview alerts loader — replace `getDashboardAlerts` with bounded row queries.
7. [x] Drop-in summary loader — wire daily/monthly totals and conversion leads.
8. [x] Subscription summary loader — plan breakdown aggregates + revenue trend `$queryRaw`.
9. [x] Remove the old full-load loaders and unused `calculations.ts` functions.
10. [x] Update or remove tests that tested the old pure JS aggregation functions.

## Out of scope

- Materialized views or pre-computed summary tables — overkill at current scale.
- Caching aggregate results across requests (Redis, etc.) — the queries are fast enough when database-backed.
- Changing the timezone model (UTC vs gym timezone) — document current behavior but don't change it here.
- Database-level pagination (covered by the pagination plan, doc 07).
