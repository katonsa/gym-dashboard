import type { BillingInterval } from "./types.ts"
import type {
  DashboardDb,
  DayWindow,
  MonthWindow,
  OverviewAggregateOptions,
  OverviewDateRanges,
  OverviewSetupState,
} from "./aggregate-types.ts"
import { getGymLocalMonthWindow } from "./date-boundaries.ts"

const MS_PER_DAY = 24 * 60 * 60 * 1000
export const OVERVIEW_ALERT_LIMIT = 50

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

export async function getMembershipMrr(
  gymId: string,
  revenueAsOf: Date,
  client: DashboardDb
) {
  const [monthly, annual] = await Promise.all([
    client.membership.aggregate({
      where: {
        member: { gymId },
        status: "ACTIVE",
        billingInterval: "MONTHLY",
        currentPeriodEndsAt: { gte: revenueAsOf },
      },
      _sum: { priceAmount: true },
    }),
    client.membership.aggregate({
      where: {
        member: { gymId },
        status: "ACTIVE",
        billingInterval: "ANNUAL",
        currentPeriodEndsAt: { gte: revenueAsOf },
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

export function getExpiredMembershipsCount(
  gymId: string,
  now: Date,
  client: DashboardDb
) {
  return client.membership.count({
    where: getExpiredMembershipWhere(gymId, now),
  })
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

export async function getOverviewSetupState(
  gymId: string,
  client: DashboardDb
): Promise<OverviewSetupState> {
  const [planTiers, members, memberships, dropIns] = await Promise.all([
    client.planTier.count({ where: { gymId } }),
    client.member.count({ where: { gymId } }),
    client.membership.count({ where: { member: { gymId } } }),
    client.dropInVisit.aggregate({
      where: { gymId },
      _sum: { visitCount: true },
    }),
  ])

  return {
    hasPlanTiers: planTiers > 0,
    hasMembers: members > 0,
    hasMemberships: memberships > 0,
    hasDropIns: (dropIns._sum.visitCount ?? 0) > 0,
  }
}

export function getExpiringMembershipWhere(
  gymId: string,
  now: Date,
  billingInterval: BillingInterval,
  windowEnd: Date
) {
  return {
    member: getRenewableMembershipMemberWhere(gymId),
    status: "ACTIVE",
    billingInterval,
    currentPeriodEndsAt: { gte: now, lte: windowEnd },
  }
}

export function getExpiredMembershipWhere(gymId: string, now: Date) {
  return {
    member: getRenewableMembershipMemberWhere(gymId),
    OR: [
      {
        status: "EXPIRED",
      },
      {
        status: "ACTIVE",
        currentPeriodEndsAt: {
          lt: now,
        },
      },
    ],
  }
}

export function getOverduePaymentWhere(gymId: string, now: Date) {
  return {
    gymId,
    OR: [{ status: "OVERDUE" }, { status: "PENDING", dueAt: { lt: now } }],
  }
}

export function getInactiveMemberWhere(gymId: string, inactiveCutoff: Date) {
  return {
    gymId,
    status: "INACTIVE",
    OR: [{ lastAttendedAt: null }, { lastAttendedAt: { lte: inactiveCutoff } }],
  }
}

export function getOverviewDateRanges(
  options: OverviewAggregateOptions
): OverviewDateRanges {
  const asOf = options.asOf ?? new Date()
  const membershipAsOf = options.membershipAsOf ?? asOf
  const monthlyWindowDays = options.expiringMonthlyWindowDays ?? 7
  const annualWindowDays = options.expiringAnnualWindowDays ?? 30
  const inactiveWindowDays = options.inactiveWindowDays ?? 30
  const { monthStart, nextMonthStart } = options.timeZone
    ? toMonthWindow(getGymLocalMonthWindow(asOf, options.timeZone))
    : getUtcMonthWindow(asOf)

  return {
    asOf,
    membershipAsOf,
    monthStart,
    nextMonthStart,
    monthlyWindowEnd: addDays(membershipAsOf, monthlyWindowDays),
    annualWindowEnd: addDays(membershipAsOf, annualWindowDays),
    inactiveCutoff: addDays(asOf, -inactiveWindowDays),
    conversionVisitThreshold: options.conversionVisitThreshold ?? 5,
    alertLimit: options.alertLimit ?? OVERVIEW_ALERT_LIMIT,
  }
}

export function getUtcDayWindow(date: Date): DayWindow {
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

function toMonthWindow(window: { start: Date; end: Date }): MonthWindow {
  return {
    monthStart: window.start,
    nextMonthStart: window.end,
  }
}

export function getUtcMonthWindow(date: Date): MonthWindow {
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

export function getMonthKey(date: Date | string) {
  return new Date(date).toISOString().slice(0, 7)
}

export function toNumber(
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

export function toDateString(date: Date | string) {
  return date instanceof Date ? date.toISOString() : date
}

function getRenewableMembershipMemberWhere(gymId: string) {
  return {
    gymId,
    status: {
      not: "SUSPENDED",
    },
  }
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY)
}
