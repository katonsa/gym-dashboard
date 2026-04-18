import type {
  BillingInterval,
  DashboardAlert,
  DashboardSummary,
  DateString,
  MemberStatus,
  PlanTier,
} from "./types"

const MS_PER_DAY = 24 * 60 * 60 * 1000
export const OVERVIEW_ALERT_LIMIT = 50

export type DashboardDb = {
  member: {
    groupBy: (args: unknown) => Promise<MemberStatusCountRow[]>
    count: (args: unknown) => Promise<number>
    findMany: (args: unknown) => Promise<InactiveMemberAlertRow[]>
  }
  membership: {
    aggregate: (args: unknown) => Promise<SumAggregateResult>
    count: (args: unknown) => Promise<number>
    findMany: (args: unknown) => Promise<ExpiringMembershipAlertRow[]>
  }
  membershipPayment: {
    count: (args: unknown) => Promise<number>
    findMany: (args: unknown) => Promise<OverduePaymentAlertRow[]>
  }
  dropInVisit: {
    aggregate: (args: unknown) => Promise<DropInTotalAggregateResult>
  }
  planTier: {
    findMany: (args: unknown) => Promise<PlanTier[]>
  }
  $queryRaw: <T = unknown>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>
}

type MemberStatusCountRow = {
  status: MemberStatus
  _count: {
    _all: number
  }
}

type SumAggregateResult = {
  _sum: {
    priceAmount: number | null
  }
}

type DropInTotalAggregateResult = {
  _sum: {
    amount: number | null
    visitCount?: number | null
  }
}

type PlanBreakdownRawRow = {
  planTierId: string
  memberCount: number | bigint
  monthlyMemberships: number | bigint
  annualMemberships: number | bigint
  monthlyEquivalentRevenue: number | bigint
}

type MembershipRevenueTrendRawRow = {
  month: Date | string
  membershipRevenue: number | bigint
}

type DropInRevenueTrendRawRow = {
  month: Date | string
  dropInRevenue: number | bigint
}

type CountRawRow = {
  count: number | bigint
}

type ConversionLeadRawRow = {
  visitorName: string
  visitorContact: string
  visitCount: number | bigint
  revenueAmount: number | bigint
}

type ExpiringMembershipAlertRow = {
  id: string
  memberId: string
  currentPeriodEndsAt: Date | string
  member: {
    firstName: string
    lastName: string
  }
}

type OverduePaymentAlertRow = {
  id: string
  memberId: string
  membershipId: string
  amount: number
  dueAt: Date | string
  member: {
    firstName: string
    lastName: string
  }
}

type InactiveMemberAlertRow = {
  id: string
  firstName: string
  lastName: string
  lastAttendedAt: Date | string | null
}

export type OverviewSetupState = {
  hasMembers: boolean
  hasMemberships: boolean
  hasDropIns: boolean
}

export type OverviewSummaryResult = {
  summary: DashboardSummary
  setupState: OverviewSetupState
}

export type DropInConversionLead = {
  visitorName: string
  visitorContact: string
  visitCount: number
  revenueAmount: number
}

export type DropInTotal = {
  revenueAmount: number
  visitCount: number
}

export type DropInSummary = {
  dailyTotal: DropInTotal
  monthlyTotal: DropInTotal
  conversionLeads: DropInConversionLead[]
  hasDropIns: boolean
}

export type SubscriptionPlanBreakdownRow = {
  id: string
  name: string
  description?: string
  memberCount: number
  memberShare: number
  monthlyMemberships: number
  annualMemberships: number
  monthlyEquivalentRevenue: number
}

export type SubscriptionRevenueTrendRow = {
  month: string
  membership: number
  dropIns: number
  total: number
}

export type SubscriptionSetupState = {
  hasPlanTiers: boolean
  hasActiveRevenueMemberships: boolean
  hasRevenueRecords: boolean
}

export type SubscriptionSummary = {
  planTiers: PlanTier[]
  planBreakdown: SubscriptionPlanBreakdownRow[]
  revenueTrend: SubscriptionRevenueTrendRow[]
  setupState: SubscriptionSetupState
}

export type OverviewAggregateOptions = {
  asOf?: Date
  expiringMonthlyWindowDays?: number
  expiringAnnualWindowDays?: number
  inactiveWindowDays?: number
  conversionVisitThreshold?: number
  alertLimit?: number
}

type OverviewDateRanges = {
  asOf: Date
  monthStart: Date
  nextMonthStart: Date
  monthlyWindowEnd: Date
  annualWindowEnd: Date
  inactiveCutoff: Date
  conversionVisitThreshold: number
  alertLimit: number
}

type MonthWindow = {
  monthStart: Date
  nextMonthStart: Date
}

type DayWindow = {
  dayStart: Date
  nextDayStart: Date
}

export async function getMemberCountsByStatus(
  gymId: string,
  client: DashboardDb
) {
  const rows = await client.member.groupBy({
    by: ["status"],
    where: { gymId },
    _count: { _all: true },
  })
  const counts = {
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    suspendedMembers: 0,
  }

  for (const row of rows) {
    counts.totalMembers += row._count._all

    if (row.status === "ACTIVE") {
      counts.activeMembers = row._count._all
    }

    if (row.status === "INACTIVE") {
      counts.inactiveMembers = row._count._all
    }

    if (row.status === "SUSPENDED") {
      counts.suspendedMembers = row._count._all
    }
  }

  return counts
}

export function getNewSignUpsThisMonth(
  gymId: string,
  monthStart: Date,
  nextMonthStart: Date,
  client: DashboardDb
) {
  return client.member.count({
    where: {
      gymId,
      joinDate: { gte: monthStart, lt: nextMonthStart },
    },
  })
}

export async function getMembershipMrr(gymId: string, client: DashboardDb) {
  const [monthly, annual] = await Promise.all([
    client.membership.aggregate({
      where: {
        member: { gymId },
        status: "ACTIVE",
        billingInterval: "MONTHLY",
      },
      _sum: { priceAmount: true },
    }),
    client.membership.aggregate({
      where: {
        member: { gymId },
        status: "ACTIVE",
        billingInterval: "ANNUAL",
      },
      _sum: { priceAmount: true },
    }),
  ])

  return (monthly._sum.priceAmount ?? 0) + (annual._sum.priceAmount ?? 0) / 12
}

export async function getDropInRevenue(
  gymId: string,
  startDate: Date,
  endDate: Date,
  client: DashboardDb
) {
  const result = await client.dropInVisit.aggregate({
    where: {
      gymId,
      visitedAt: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
  })

  return result._sum.amount ?? 0
}

export async function getDropInTotal(
  gymId: string,
  startDate: Date,
  endDate: Date,
  client: DashboardDb
): Promise<DropInTotal> {
  const result = await client.dropInVisit.aggregate({
    where: {
      gymId,
      visitedAt: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true, visitCount: true },
  })

  return {
    revenueAmount: result._sum.amount ?? 0,
    visitCount: result._sum.visitCount ?? 0,
  }
}

export async function getExpiringMembershipsCount(
  gymId: string,
  now: Date,
  monthlyWindowEnd: Date,
  annualWindowEnd: Date,
  client: DashboardDb
) {
  const [monthlyExpiring, annualExpiring] = await Promise.all([
    client.membership.count({
      where: getExpiringMembershipWhere(
        gymId,
        now,
        "MONTHLY",
        monthlyWindowEnd
      ),
    }),
    client.membership.count({
      where: getExpiringMembershipWhere(gymId, now, "ANNUAL", annualWindowEnd),
    }),
  ])

  return monthlyExpiring + annualExpiring
}

export function getOverduePaymentsCount(
  gymId: string,
  now: Date,
  client: DashboardDb
) {
  return client.membershipPayment.count({
    where: getOverduePaymentWhere(gymId, now),
  })
}

export function getInactiveMembersCount(
  gymId: string,
  inactiveCutoff: Date,
  client: DashboardDb
) {
  return client.member.count({
    where: getInactiveMemberWhere(gymId, inactiveCutoff),
  })
}

export async function getConversionLeadsCount(
  gymId: string,
  monthStart: Date,
  nextMonthStart: Date,
  threshold: number,
  client: DashboardDb
) {
  const rows = await client.$queryRaw<CountRawRow[]>`
    SELECT COUNT(*)::int as "count" FROM (
      SELECT LOWER("visitorContact")
      FROM "DropInVisit"
      WHERE "gymId" = ${gymId}
        AND "visitedAt" >= ${monthStart}
        AND "visitedAt" < ${nextMonthStart}
        AND "visitorName" IS NOT NULL
        AND "visitorContact" IS NOT NULL
      GROUP BY LOWER("visitorContact")
      HAVING SUM("visitCount") >= ${threshold}
    ) as leads
  `

  return toNumber(rows[0]?.count)
}

export async function getConversionLeads(
  gymId: string,
  monthStart: Date,
  nextMonthStart: Date,
  threshold: number,
  limit: number | null = OVERVIEW_ALERT_LIMIT,
  client: DashboardDb
): Promise<DropInConversionLead[]> {
  if (limit === null) {
    const rows = await client.$queryRaw<ConversionLeadRawRow[]>`
      SELECT
        MIN("visitorName") as "visitorName",
        MIN("visitorContact") as "visitorContact",
        SUM("visitCount")::int as "visitCount",
        SUM("amount")::int as "revenueAmount"
      FROM "DropInVisit"
      WHERE "gymId" = ${gymId}
        AND "visitedAt" >= ${monthStart}
        AND "visitedAt" < ${nextMonthStart}
        AND "visitorName" IS NOT NULL
        AND "visitorContact" IS NOT NULL
      GROUP BY LOWER("visitorContact")
      HAVING SUM("visitCount") >= ${threshold}
      ORDER BY "visitCount" DESC
    `

    return mapConversionLeads(rows)
  }

  const rows = await client.$queryRaw<ConversionLeadRawRow[]>`
    SELECT
      MIN("visitorName") as "visitorName",
      MIN("visitorContact") as "visitorContact",
      SUM("visitCount")::int as "visitCount",
      SUM("amount")::int as "revenueAmount"
    FROM "DropInVisit"
    WHERE "gymId" = ${gymId}
      AND "visitedAt" >= ${monthStart}
      AND "visitedAt" < ${nextMonthStart}
      AND "visitorName" IS NOT NULL
      AND "visitorContact" IS NOT NULL
    GROUP BY LOWER("visitorContact")
    HAVING SUM("visitCount") >= ${threshold}
    ORDER BY "visitCount" DESC
    LIMIT ${limit}
  `

  return mapConversionLeads(rows)
}

export async function getOverviewSetupState(
  gymId: string,
  client: DashboardDb
): Promise<OverviewSetupState> {
  const [members, memberships, dropIns] = await Promise.all([
    client.member.count({ where: { gymId } }),
    client.membership.count({ where: { member: { gymId } } }),
    client.dropInVisit.aggregate({
      where: { gymId },
      _sum: { visitCount: true },
    }),
  ])

  return {
    hasMembers: members > 0,
    hasMemberships: memberships > 0,
    hasDropIns: (dropIns._sum.visitCount ?? 0) > 0,
  }
}

export async function getOverviewSummary(
  gymId: string,
  currencyCode: string,
  options: OverviewAggregateOptions = {},
  client: DashboardDb
): Promise<OverviewSummaryResult> {
  const ranges = getOverviewDateRanges(options)
  const [
    memberCounts,
    newSignUpsThisMonth,
    membershipMrrAmount,
    dropInRevenueThisMonthAmount,
    expiringMembershipsCount,
    overduePaymentsCount,
    inactiveMembersCount,
    dropInConversionOpportunitiesCount,
    setupState,
  ] = await Promise.all([
    getMemberCountsByStatus(gymId, client),
    getNewSignUpsThisMonth(
      gymId,
      ranges.monthStart,
      ranges.nextMonthStart,
      client
    ),
    getMembershipMrr(gymId, client),
    getDropInRevenue(gymId, ranges.monthStart, ranges.nextMonthStart, client),
    getExpiringMembershipsCount(
      gymId,
      ranges.asOf,
      ranges.monthlyWindowEnd,
      ranges.annualWindowEnd,
      client
    ),
    getOverduePaymentsCount(gymId, ranges.asOf, client),
    getInactiveMembersCount(gymId, ranges.inactiveCutoff, client),
    getConversionLeadsCount(
      gymId,
      ranges.monthStart,
      ranges.nextMonthStart,
      ranges.conversionVisitThreshold,
      client
    ),
    getOverviewSetupState(gymId, client),
  ])

  return {
    summary: {
      asOf: ranges.asOf.toISOString(),
      currencyCode,
      ...memberCounts,
      newSignUpsThisMonth,
      membershipMrrAmount,
      dropInRevenueThisMonthAmount,
      totalRevenueThisMonthAmount:
        membershipMrrAmount + dropInRevenueThisMonthAmount,
      expiringMembershipsCount,
      overduePaymentsCount,
      inactiveMembersCount,
      dropInConversionOpportunitiesCount,
    },
    setupState,
  }
}

export async function getDropInSummary(
  gymId: string,
  options: OverviewAggregateOptions = {},
  client: DashboardDb
): Promise<DropInSummary> {
  const asOf = options.asOf ?? new Date()
  const { dayStart, nextDayStart } = getUtcDayWindow(asOf)
  const { monthStart, nextMonthStart } = getUtcMonthWindow(asOf)
  const threshold = options.conversionVisitThreshold ?? 5
  const [dailyTotal, monthlyTotal, conversionLeads, allDropInTotal] =
    await Promise.all([
      getDropInTotal(gymId, dayStart, nextDayStart, client),
      getDropInTotal(gymId, monthStart, nextMonthStart, client),
      getConversionLeads(
        gymId,
        monthStart,
        nextMonthStart,
        threshold,
        null,
        client
      ),
      client.dropInVisit.aggregate({
        where: { gymId },
        _sum: { visitCount: true },
      }),
    ])

  return {
    dailyTotal,
    monthlyTotal,
    conversionLeads,
    hasDropIns: (allDropInTotal._sum.visitCount ?? 0) > 0,
  }
}

export async function getSubscriptionSummary(
  gymId: string,
  planTiers: PlanTier[],
  currentMonth: Date,
  client: DashboardDb
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
    getPlanBreakdownAggregates(gymId, planTiers, client),
    getRevenueTrend(gymId, startMonth, monthStart, nextMonthAfterTrend, client),
    client.membership.count({
      where: {
        member: { gymId },
        status: { in: ["ACTIVE", "PAST_DUE"] },
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

export async function getPlanBreakdownAggregates(
  gymId: string,
  planTiers: PlanTier[],
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
      AND "status" IN ('ACTIVE', 'PAST_DUE')
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

export async function getOverviewAlerts(
  gymId: string,
  currencyCode: string,
  options: OverviewAggregateOptions = {},
  client: DashboardDb
): Promise<DashboardAlert[]> {
  const ranges = getOverviewDateRanges(options)
  const [
    overduePayments,
    monthlyExpiring,
    annualExpiring,
    inactiveMembers,
    leads,
  ] = await Promise.all([
    getOverduePaymentAlerts(gymId, ranges.asOf, ranges.alertLimit, client),
    getExpiringMembershipAlerts(
      gymId,
      ranges.asOf,
      "MONTHLY",
      ranges.monthlyWindowEnd,
      ranges.alertLimit,
      client
    ),
    getExpiringMembershipAlerts(
      gymId,
      ranges.asOf,
      "ANNUAL",
      ranges.annualWindowEnd,
      ranges.alertLimit,
      client
    ),
    getInactiveMemberAlerts(
      gymId,
      ranges.inactiveCutoff,
      ranges.alertLimit,
      client
    ),
    getConversionLeads(
      gymId,
      ranges.monthStart,
      ranges.nextMonthStart,
      ranges.conversionVisitThreshold,
      ranges.alertLimit,
      client
    ),
  ])
  const expiringMemberships = [...monthlyExpiring, ...annualExpiring]
    .toSorted(
      (left, right) =>
        new Date(left.currentPeriodEndsAt).getTime() -
        new Date(right.currentPeriodEndsAt).getTime()
    )
    .slice(0, ranges.alertLimit)

  return [
    ...overduePayments.map((payment) => {
      return {
        id: `overdue-${payment.id}`,
        type: "OVERDUE_PAYMENT",
        severity: "critical",
        title: `${formatMemberName(payment.member)} has overdue payment`,
        detail: `${formatCurrency(payment.amount, currencyCode)} due ${formatDate(payment.dueAt)}.`,
        memberId: payment.memberId,
        membershipId: payment.membershipId,
        paymentId: payment.id,
        dueAt: toDateString(payment.dueAt),
      } satisfies DashboardAlert
    }),
    ...expiringMemberships.map((membership) => {
      return {
        id: `expiring-${membership.id}`,
        type: "EXPIRING_MEMBERSHIP",
        severity: "warning",
        title: `${formatMemberName(membership.member)} renews soon`,
        detail: `Membership ends ${formatDate(membership.currentPeriodEndsAt)}.`,
        memberId: membership.memberId,
        membershipId: membership.id,
        dueAt: toDateString(membership.currentPeriodEndsAt),
      } satisfies DashboardAlert
    }),
    ...inactiveMembers.map((member) => {
      return {
        id: `inactive-${member.id}`,
        type: "INACTIVE_MEMBER",
        severity: "warning",
        title: `${formatMemberName(member)} is inactive`,
        detail: member.lastAttendedAt
          ? `Last visit was ${formatDate(member.lastAttendedAt)}.`
          : "No attendance recorded.",
        memberId: member.id,
      } satisfies DashboardAlert
    }),
    ...leads.map((visitor) => {
      return {
        id: `conversion-${visitor.visitorContact}`,
        type: "DROP_IN_CONVERSION",
        severity: "opportunity",
        title: `${visitor.visitorName} is ready for follow-up`,
        detail: `${visitor.visitCount} drop-in visits this month, ${formatCurrency(
          visitor.revenueAmount,
          currencyCode
        )} paid.`,
        visitorContact: visitor.visitorContact,
      } satisfies DashboardAlert
    }),
  ]
}

async function getExpiringMembershipAlerts(
  gymId: string,
  now: Date,
  billingInterval: BillingInterval,
  windowEnd: Date,
  limit: number,
  client: DashboardDb
) {
  return client.membership.findMany({
    where: getExpiringMembershipWhere(gymId, now, billingInterval, windowEnd),
    orderBy: [{ currentPeriodEndsAt: "asc" }, { id: "asc" }],
    take: limit,
    select: {
      id: true,
      memberId: true,
      currentPeriodEndsAt: true,
      member: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })
}

function getOverduePaymentAlerts(
  gymId: string,
  now: Date,
  limit: number,
  client: DashboardDb
) {
  return client.membershipPayment.findMany({
    where: getOverduePaymentWhere(gymId, now),
    orderBy: [{ dueAt: "asc" }, { id: "asc" }],
    take: limit,
    select: {
      id: true,
      memberId: true,
      membershipId: true,
      amount: true,
      dueAt: true,
      member: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })
}

function getInactiveMemberAlerts(
  gymId: string,
  inactiveCutoff: Date,
  limit: number,
  client: DashboardDb
) {
  return client.member.findMany({
    where: getInactiveMemberWhere(gymId, inactiveCutoff),
    orderBy: [
      { lastAttendedAt: { sort: "asc", nulls: "first" } },
      { id: "asc" },
    ],
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      lastAttendedAt: true,
    },
  })
}

function getExpiringMembershipWhere(
  gymId: string,
  now: Date,
  billingInterval: BillingInterval,
  windowEnd: Date
) {
  return {
    member: { gymId },
    status: "ACTIVE",
    billingInterval,
    currentPeriodEndsAt: { gte: now, lte: windowEnd },
  }
}

function getOverduePaymentWhere(gymId: string, now: Date) {
  return {
    gymId,
    OR: [{ status: "OVERDUE" }, { status: "PENDING", dueAt: { lt: now } }],
  }
}

function getInactiveMemberWhere(gymId: string, inactiveCutoff: Date) {
  return {
    gymId,
    status: "INACTIVE",
    OR: [{ lastAttendedAt: null }, { lastAttendedAt: { lte: inactiveCutoff } }],
  }
}

function getOverviewDateRanges(
  options: OverviewAggregateOptions
): OverviewDateRanges {
  const asOf = options.asOf ?? new Date()
  const monthlyWindowDays = options.expiringMonthlyWindowDays ?? 7
  const annualWindowDays = options.expiringAnnualWindowDays ?? 30
  const inactiveWindowDays = options.inactiveWindowDays ?? 30
  const { monthStart, nextMonthStart } = getUtcMonthWindow(asOf)

  return {
    asOf,
    monthStart,
    nextMonthStart,
    monthlyWindowEnd: addDays(asOf, monthlyWindowDays),
    annualWindowEnd: addDays(asOf, annualWindowDays),
    inactiveCutoff: addDays(asOf, -inactiveWindowDays),
    conversionVisitThreshold: options.conversionVisitThreshold ?? 5,
    alertLimit: options.alertLimit ?? OVERVIEW_ALERT_LIMIT,
  }
}

function getUtcDayWindow(date: Date): DayWindow {
  // Existing dashboard calculations use UTC day boundaries. The gym timezone
  // should drive these windows in a future behavior change.
  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  const nextDayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
  )

  return { dayStart, nextDayStart }
}

function getUtcMonthWindow(date: Date): MonthWindow {
  // Existing dashboard calculations use UTC month boundaries. The gym timezone
  // should drive these windows in a future behavior change.
  return {
    monthStart: new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
    ),
    nextMonthStart: new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
    ),
  }
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function getMonthKey(date: Date | string) {
  return new Date(date).toISOString().slice(0, 7)
}

function mapConversionLeads(
  rows: ConversionLeadRawRow[]
): DropInConversionLead[] {
  return rows.map((row) => ({
    visitorName: row.visitorName,
    visitorContact: row.visitorContact,
    visitCount: toNumber(row.visitCount),
    revenueAmount: toNumber(row.revenueAmount),
  }))
}

function toNumber(
  value: number | bigint | { toString: () => string } | undefined
) {
  if (typeof value === "bigint") {
    return Number(value)
  }

  if (typeof value === "number") {
    return value
  }

  if (value) {
    return Number(value.toString())
  }

  return 0
}

function toDateString(date: Date | string): DateString {
  return date instanceof Date ? date.toISOString() : date
}

function formatMemberName(member: { firstName: string; lastName: string }) {
  return `${member.firstName} ${member.lastName}`
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount)
}
