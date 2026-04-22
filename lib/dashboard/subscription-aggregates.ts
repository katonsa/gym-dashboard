import {
  getMonthKey,
  getUtcMonthWindow,
  toNumber,
} from "./aggregate-queries.ts"
import { getGymLocalMonthWindow } from "./date-boundaries.ts"
import type {
  DashboardDb,
  DropInRevenueTrendRawRow,
  MembershipRevenueTrendRawRow,
  PlanBreakdownRawRow,
  PlanUsageRawRow,
  PlanTier,
  SubscriptionPlanBreakdownRow,
  SubscriptionRevenueTrendRow,
  SubscriptionSummary,
} from "./aggregate-types.ts"

type RevenueTrendDb = {
  $queryRaw: <T = unknown>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>
}

export async function getSubscriptionSummary(
  gymId: string,
  planTiers: PlanTier[],
  currentMonth: Date,
  revenueAsOf: Date,
  client: DashboardDb,
  timeZone?: string
): Promise<SubscriptionSummary> {
  const { monthStart } = getUtcMonthWindow(currentMonth)
  const startMonth = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 5, 1)
  )
  const nextMonthAfterTrend = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)
  )
  const [
    planAggregates,
    revenueTrend,
    activeRevenueMemberships,
    allMemberships,
    allPayments,
    allDropInTotal,
  ] = await Promise.all([
    getPlanBreakdownAggregates(gymId, planTiers, revenueAsOf, client),
    timeZone
      ? getRevenueTrendForTimeZone(gymId, currentMonth, timeZone, client)
      : getRevenueTrend(
          gymId,
          startMonth,
          monthStart,
          nextMonthAfterTrend,
          client
        ),
    client.membership.count({
      where: {
        member: { gymId },
        status: "ACTIVE",
        currentPeriodEndsAt: { gte: revenueAsOf },
      },
    }),
    client.membership.count({ where: { member: { gymId } } }),
    client.membershipPayment.count({ where: { gymId } }),
    client.dropInVisit.aggregate({
      where: { gymId },
      _sum: { visitCount: true },
    }),
  ])

  return {
    planTiers,
    planBreakdown: planAggregates,
    revenueTrend,
    setupState: {
      hasPlanTiers: planTiers.length > 0,
      hasActiveRevenueMemberships: activeRevenueMemberships > 0,
      hasRevenueRecords:
        allMemberships > 0 ||
        allPayments > 0 ||
        (allDropInTotal._sum.visitCount ?? 0) > 0,
    },
  }
}

type RevenueTrendWindow = {
  sortOrder: number
  label: string
  start: Date
  end: Date
}

type SubscriptionRevenueTrendRawRow = {
  month: string
  membershipRevenue: number | bigint
  dropInRevenue: number | bigint
}

export async function getRevenueTrendForTimeZone(
  gymId: string,
  currentMonth: Date,
  timeZone: string,
  client: RevenueTrendDb
): Promise<SubscriptionRevenueTrendRow[]> {
  const windows = Array.from({ length: 6 }, (_, index) => {
    const sortOrder = index
    const window = getGymLocalMonthWindow(currentMonth, timeZone, index - 5)

    return {
      sortOrder,
      label: new Intl.DateTimeFormat("en", {
        month: "short",
        timeZone,
      }).format(window.start),
      start: window.start,
      end: window.end,
    } satisfies RevenueTrendWindow
  })

  const [
    window0,
    window1,
    window2,
    window3,
    window4,
    window5,
  ] = windows
  const rows = await client.$queryRaw<SubscriptionRevenueTrendRawRow[]>`
    WITH month_windows AS (
      SELECT
        ${window0.sortOrder}::int as "sortOrder",
        ${window0.label}::text as "month",
        ${window0.start}::timestamptz as "startAt",
        ${window0.end}::timestamptz as "endAt"
      UNION ALL
      SELECT
        ${window1.sortOrder}::int,
        ${window1.label}::text,
        ${window1.start}::timestamptz,
        ${window1.end}::timestamptz
      UNION ALL
      SELECT
        ${window2.sortOrder}::int,
        ${window2.label}::text,
        ${window2.start}::timestamptz,
        ${window2.end}::timestamptz
      UNION ALL
      SELECT
        ${window3.sortOrder}::int,
        ${window3.label}::text,
        ${window3.start}::timestamptz,
        ${window3.end}::timestamptz
      UNION ALL
      SELECT
        ${window4.sortOrder}::int,
        ${window4.label}::text,
        ${window4.start}::timestamptz,
        ${window4.end}::timestamptz
      UNION ALL
      SELECT
        ${window5.sortOrder}::int,
        ${window5.label}::text,
        ${window5.start}::timestamptz,
        ${window5.end}::timestamptz
    ),
    gym_memberships AS (
      SELECT
        membership."startedAt",
        membership."canceledAt",
        membership."currentPeriodEndsAt",
        membership."billingInterval",
        membership."priceAmount"
      FROM "Membership" membership
      INNER JOIN "Member" member
        ON member.id = membership."memberId"
      WHERE member."gymId" = ${gymId}
    ),
    membership_totals AS (
      SELECT
        windows."sortOrder" as "sortOrder",
        COALESCE(SUM(
          CASE WHEN membership."billingInterval" = 'ANNUAL'
            THEN membership."priceAmount" / 12.0
            ELSE membership."priceAmount"
          END
        ), 0)::float8 as "membershipRevenue"
      FROM month_windows windows
      LEFT JOIN gym_memberships membership
        ON membership."startedAt" < windows."endAt"
        AND COALESCE(
          membership."canceledAt",
          membership."currentPeriodEndsAt"
        ) >= windows."startAt"
      GROUP BY windows."sortOrder"
    ),
    drop_in_totals AS (
      SELECT
        windows."sortOrder" as "sortOrder",
        COALESCE(SUM(drop_in."amount"), 0)::int as "dropInRevenue"
      FROM month_windows windows
      LEFT JOIN "DropInVisit" drop_in
        ON drop_in."gymId" = ${gymId}
        AND drop_in."visitedAt" >= windows."startAt"
        AND drop_in."visitedAt" < windows."endAt"
      GROUP BY windows."sortOrder"
    )
    SELECT
      windows."month" as "month",
      COALESCE(membership_totals."membershipRevenue", 0)::float8
        as "membershipRevenue",
      COALESCE(drop_in_totals."dropInRevenue", 0)::int as "dropInRevenue"
    FROM month_windows windows
    LEFT JOIN membership_totals
      ON membership_totals."sortOrder" = windows."sortOrder"
    LEFT JOIN drop_in_totals
      ON drop_in_totals."sortOrder" = windows."sortOrder"
    ORDER BY windows."sortOrder"
  `

  return rows.map((row) => {
    const membership = toNumber(row.membershipRevenue)
    const dropIns = toNumber(row.dropInRevenue)

    return {
      month: row.month,
      membership,
      dropIns,
      total: membership + dropIns,
    }
  })
}

export async function getPlanBreakdownAggregates(
  gymId: string,
  planTiers: PlanTier[],
  revenueAsOf: Date,
  client: DashboardDb
): Promise<SubscriptionPlanBreakdownRow[]> {
  const [rows, planUsageRows] = await Promise.all([
    client.$queryRaw<PlanBreakdownRawRow[]>`
      SELECT
        membership."planTierId" as "planTierId",
        COUNT(*)::int as "memberCount",
        COUNT(*) FILTER (
          WHERE membership."billingInterval" = 'MONTHLY'
        )::int as "monthlyMemberships",
        COUNT(*) FILTER (
          WHERE membership."billingInterval" = 'ANNUAL'
        )::int as "annualMemberships",
        COALESCE(SUM(
          CASE WHEN membership."billingInterval" = 'ANNUAL'
            THEN membership."priceAmount" / 12.0
            ELSE membership."priceAmount"
          END
        ), 0)::float8 as "monthlyEquivalentRevenue"
      FROM "Membership" membership
      INNER JOIN "Member" member
        ON member.id = membership."memberId"
      WHERE member."gymId" = ${gymId}
        AND membership."status" = 'ACTIVE'
        AND membership."currentPeriodEndsAt" >= ${revenueAsOf}
      GROUP BY membership."planTierId"
    `,
    client.$queryRaw<PlanUsageRawRow[]>`
      SELECT DISTINCT membership."planTierId" as "planTierId"
      FROM "Membership" membership
      INNER JOIN "Member" member
        ON member.id = membership."memberId"
      WHERE member."gymId" = ${gymId}
    `,
  ])
  const rowByPlanId = new Map(rows.map((row) => [row.planTierId, row]))
  const usedPlanIds = new Set(planUsageRows.map((row) => row.planTierId))
  const totalRevenueMemberships = rows.reduce(
    (total, row) => total + toNumber(row.memberCount),
    0
  )

  return planTiers
    .filter((plan) => plan.isActive || usedPlanIds.has(plan.id))
    .toSorted((left, right) => left.sortOrder - right.sortOrder)
    .map((plan) => {
      const row = rowByPlanId.get(plan.id)
      const memberCount = toNumber(row?.memberCount)

      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        memberCount,
        memberShare:
          totalRevenueMemberships > 0
            ? memberCount / totalRevenueMemberships
            : 0,
        monthlyMemberships: toNumber(row?.monthlyMemberships),
        annualMemberships: toNumber(row?.annualMemberships),
        monthlyEquivalentRevenue: toNumber(row?.monthlyEquivalentRevenue),
      }
    })
}

export async function getRevenueTrend(
  gymId: string,
  startMonth: Date,
  endMonth: Date,
  nextMonthAfterTrend: Date,
  client: DashboardDb
): Promise<SubscriptionRevenueTrendRow[]> {
  const [membershipRows, dropInRows] = await Promise.all([
    client.$queryRaw<MembershipRevenueTrendRawRow[]>`
      SELECT
        date_trunc('month', month_series)::date as "month",
        COALESCE(SUM(
          CASE WHEN m."billingInterval" = 'ANNUAL'
            THEN m."priceAmount" / 12.0
            ELSE m."priceAmount"
          END
        ), 0)::float8 as "membershipRevenue"
      FROM generate_series(${startMonth}, ${endMonth}, interval '1 month') as month_series
      LEFT JOIN "Membership" m ON
        m."memberId" IN (SELECT id FROM "Member" WHERE "gymId" = ${gymId})
        AND m."startedAt" <= (month_series + interval '1 month' - interval '1 second')
        AND COALESCE(m."canceledAt", m."currentPeriodEndsAt") >= month_series
      GROUP BY month
      ORDER BY month
    `,
    client.$queryRaw<DropInRevenueTrendRawRow[]>`
      SELECT
        date_trunc('month', "visitedAt")::date as "month",
        COALESCE(SUM("amount"), 0)::int as "dropInRevenue"
      FROM "DropInVisit"
      WHERE "gymId" = ${gymId}
        AND "visitedAt" >= ${startMonth}
        AND "visitedAt" < ${nextMonthAfterTrend}
      GROUP BY month
      ORDER BY month
    `,
  ])
  const dropInsByMonth = new Map(
    dropInRows.map((row) => [
      getMonthKey(row.month),
      toNumber(row.dropInRevenue),
    ])
  )

  return membershipRows.map((row) => {
    const month = new Date(row.month)
    const membership = toNumber(row.membershipRevenue)
    const dropIns = dropInsByMonth.get(getMonthKey(row.month)) ?? 0

    return {
      month: new Intl.DateTimeFormat("en", { month: "short" }).format(month),
      membership,
      dropIns,
      total: membership + dropIns,
    }
  })
}
