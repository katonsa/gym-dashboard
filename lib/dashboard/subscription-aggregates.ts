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
  PlanTier,
  SubscriptionPlanBreakdownRow,
  SubscriptionRevenueTrendRow,
  SubscriptionSummary,
} from "./aggregate-types.ts"

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
  label: string
  start: Date
  end: Date
}

type MembershipRevenueTotalRawRow = {
  membershipRevenue: number | bigint
}

type DropInRevenueTotalRawRow = {
  dropInRevenue: number | bigint
}

async function getRevenueTrendForTimeZone(
  gymId: string,
  currentMonth: Date,
  timeZone: string,
  client: DashboardDb
): Promise<SubscriptionRevenueTrendRow[]> {
  const windows = Array.from({ length: 6 }, (_, index) => {
    const window = getGymLocalMonthWindow(currentMonth, timeZone, index - 5)

    return {
      label: new Intl.DateTimeFormat("en", {
        month: "short",
        timeZone,
      }).format(window.start),
      start: window.start,
      end: window.end,
    } satisfies RevenueTrendWindow
  })

  return Promise.all(
    windows.map(async (window) => {
      const [membershipRows, dropInRows] = await Promise.all([
        client.$queryRaw<MembershipRevenueTotalRawRow[]>`
          SELECT
            COALESCE(SUM(
              CASE WHEN m."billingInterval" = 'ANNUAL'
                THEN m."priceAmount" / 12.0
                ELSE m."priceAmount"
              END
            ), 0)::float8 as "membershipRevenue"
          FROM "Membership" m
          WHERE m."memberId" IN (SELECT id FROM "Member" WHERE "gymId" = ${gymId})
            AND m."startedAt" < ${window.end}
            AND COALESCE(m."canceledAt", m."currentPeriodEndsAt") >= ${window.start}
        `,
        client.$queryRaw<DropInRevenueTotalRawRow[]>`
          SELECT COALESCE(SUM("amount"), 0)::int as "dropInRevenue"
          FROM "DropInVisit"
          WHERE "gymId" = ${gymId}
            AND "visitedAt" >= ${window.start}
            AND "visitedAt" < ${window.end}
        `,
      ])
      const membership = toNumber(membershipRows[0]?.membershipRevenue)
      const dropIns = toNumber(dropInRows[0]?.dropInRevenue)

      return {
        month: window.label,
        membership,
        dropIns,
        total: membership + dropIns,
      }
    })
  )
}

export async function getPlanBreakdownAggregates(
  gymId: string,
  planTiers: PlanTier[],
  revenueAsOf: Date,
  client: DashboardDb
): Promise<SubscriptionPlanBreakdownRow[]> {
  const rows = await client.$queryRaw<PlanBreakdownRawRow[]>`
    SELECT
      "planTierId" as "planTierId",
      COUNT(*)::int as "memberCount",
      COUNT(*) FILTER (WHERE "billingInterval" = 'MONTHLY')::int as "monthlyMemberships",
      COUNT(*) FILTER (WHERE "billingInterval" = 'ANNUAL')::int as "annualMemberships",
      COALESCE(SUM(
        CASE WHEN "billingInterval" = 'ANNUAL'
          THEN "priceAmount" / 12.0
          ELSE "priceAmount"
        END
      ), 0)::float8 as "monthlyEquivalentRevenue"
    FROM "Membership"
    WHERE "memberId" IN (SELECT id FROM "Member" WHERE "gymId" = ${gymId})
      AND "status" = 'ACTIVE'
      AND "currentPeriodEndsAt" >= ${revenueAsOf}
    GROUP BY "planTierId"
  `
  const rowByPlanId = new Map(rows.map((row) => [row.planTierId, row]))
  const totalRevenueMemberships = rows.reduce(
    (total, row) => total + toNumber(row.memberCount),
    0
  )

  return planTiers
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
