import { formatCurrency, formatDate, formatMemberName } from "./formatters.ts"
import type { BillingInterval, DashboardAlert } from "./types.ts"
import {
  getDropInRevenue,
  getExpiredMembershipsCount,
  getExpiredMembershipWhere,
  getExpiringMembershipsCount,
  getExpiringMembershipWhere,
  getInactiveMemberWhere,
  getInactiveMembersCount,
  getMemberCountsByStatus,
  getMembershipMrr,
  getNewSignUpsThisMonth,
  getOverduePaymentWhere,
  getOverduePaymentsCount,
  getOverviewDateRanges,
  getOverviewSetupState,
  toDateString,
  toNumber,
} from "./aggregate-queries.ts"
import {
  getConversionLeads,
  getConversionLeadsCount,
} from "./drop-in-aggregates.ts"
import type {
  AgingBucketRawRow,
  DashboardDb,
  ExpiringMembershipAlertRow,
  InactiveMemberAlertRow,
  OverdueAgingSummary,
  OverduePaymentAlertRow,
  OverviewAggregateOptions,
  OverviewSummaryResult,
} from "./aggregate-types.ts"

export * from "./aggregate-types.ts"
export * from "./aggregate-queries.ts"
export * from "./drop-in-aggregates.ts"
export * from "./subscription-aggregates.ts"

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
    expiredMembershipsCount,
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
    getMembershipMrr(gymId, ranges.membershipAsOf, client),
    getDropInRevenue(gymId, ranges.monthStart, ranges.nextMonthStart, client),
    getExpiringMembershipsCount(
      gymId,
      ranges.membershipAsOf,
      ranges.monthlyWindowEnd,
      ranges.annualWindowEnd,
      client
    ),
    getExpiredMembershipsCount(gymId, ranges.membershipAsOf, client),
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
      expiredMembershipsCount,
      overduePaymentsCount,
      inactiveMembersCount,
      dropInConversionOpportunitiesCount,
    },
    setupState,
  }
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
    expiredMemberships,
    monthlyExpiring,
    annualExpiring,
    inactiveMembers,
    leads,
  ] = await Promise.all([
    getOverduePaymentAlerts(gymId, ranges.asOf, ranges.alertLimit, client),
    getExpiredMembershipAlerts(
      gymId,
      ranges.membershipAsOf,
      ranges.alertLimit,
      client
    ),
    getExpiringMembershipAlerts(
      gymId,
      ranges.membershipAsOf,
      "MONTHLY",
      ranges.monthlyWindowEnd,
      ranges.alertLimit,
      client
    ),
    getExpiringMembershipAlerts(
      gymId,
      ranges.membershipAsOf,
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
    ...expiredMemberships.map((membership) => {
      return {
        id: `expired-${membership.id}`,
        type: "EXPIRED_MEMBERSHIP",
        severity: "critical",
        title: `${formatMemberName(membership.member)} membership expired`,
        detail: `Membership ended ${formatDate(membership.currentPeriodEndsAt)}.`,
        memberId: membership.memberId,
        membershipId: membership.id,
        membershipStatus: membership.status,
        dueAt: toDateString(membership.currentPeriodEndsAt),
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
        membershipStatus: membership.status,
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

export async function getOverdueAgingSummary(
  gymId: string,
  now: Date,
  client: DashboardDb
): Promise<OverdueAgingSummary> {
  const rows = await client.$queryRaw<AgingBucketRawRow[]>`
    SELECT
      CASE
        WHEN age_days BETWEEN 1 AND 7 THEN '1-7 days'
        WHEN age_days BETWEEN 8 AND 14 THEN '8-14 days'
        WHEN age_days BETWEEN 15 AND 30 THEN '15-30 days'
        ELSE '30+ days'
      END as "bucket",
      COUNT(*)::int as "count",
      COALESCE(SUM("amount"), 0)::int as "totalAmount"
    FROM (
      SELECT
        "amount",
        GREATEST(1, EXTRACT(DAY FROM (${now}::timestamp - "dueAt"))::int) as age_days
      FROM "MembershipPayment"
      WHERE "gymId" = ${gymId}
        AND (
          "status" = 'OVERDUE'
          OR ("status" = 'PENDING' AND "dueAt" < ${now})
        )
    ) as aged
    GROUP BY "bucket"
    ORDER BY MIN(age_days)
  `

  return rows.map((row) => ({
    bucket: row.bucket,
    count: toNumber(row.count),
    totalAmount: toNumber(row.totalAmount),
  }))
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
      status: true,
      currentPeriodEndsAt: true,
      member: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  }) as Promise<ExpiringMembershipAlertRow[]>
}

function getExpiredMembershipAlerts(
  gymId: string,
  now: Date,
  limit: number,
  client: DashboardDb
) {
  return client.membership.findMany({
    where: getExpiredMembershipWhere(gymId, now),
    orderBy: [{ currentPeriodEndsAt: "asc" }, { id: "asc" }],
    take: limit,
    select: {
      id: true,
      memberId: true,
      status: true,
      currentPeriodEndsAt: true,
      member: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  }) as Promise<ExpiringMembershipAlertRow[]>
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
  }) as Promise<OverduePaymentAlertRow[]>
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
  }) as Promise<InactiveMemberAlertRow[]>
}
