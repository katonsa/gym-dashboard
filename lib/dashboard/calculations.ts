import type {
  DashboardAlert,
  DashboardData,
  DashboardSummary,
  DropInVisit,
  Member,
  MemberWithMembership,
  Membership,
  MembershipPayment,
} from "@/lib/dashboard/types"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type DashboardCalculationOptions = {
  asOf?: Date
  expiringMonthlyWindowDays?: number
  expiringAnnualWindowDays?: number
  inactiveWindowDays?: number
  conversionVisitThreshold?: number
}

export type DropInConversionOpportunity = {
  visitorName: string
  visitorContact: string
  visitCount: number
  revenueAmount: number
}

export function getMemberCounts(members: Member[]) {
  return members.reduce(
    (counts, member) => {
      counts.totalMembers += 1

      if (member.status === "ACTIVE") {
        counts.activeMembers += 1
      }

      if (member.status === "INACTIVE") {
        counts.inactiveMembers += 1
      }

      if (member.status === "SUSPENDED") {
        counts.suspendedMembers += 1
      }

      return counts
    },
    {
      totalMembers: 0,
      activeMembers: 0,
      inactiveMembers: 0,
      suspendedMembers: 0,
    }
  )
}

export function calculateMembershipMrr(memberships: Membership[]) {
  return memberships.reduce((total, membership) => {
    if (membership.status !== "ACTIVE") {
      return total
    }

    return (
      total +
      (membership.billingInterval === "ANNUAL"
        ? membership.priceAmount / 12
        : membership.priceAmount)
    )
  }, 0)
}

export function calculateDropInRevenueForMonth(
  dropIns: DropInVisit[],
  asOf = new Date()
) {
  return dropIns.reduce((total, dropIn) => {
    return isSameMonth(dropIn.visitedAt, asOf) ? total + dropIn.amount : total
  }, 0)
}

export function calculateTotalRevenueForMonth(
  memberships: Membership[],
  dropIns: DropInVisit[],
  asOf = new Date()
) {
  return (
    calculateMembershipMrr(memberships) +
    calculateDropInRevenueForMonth(dropIns, asOf)
  )
}

export function getExpiringMemberships(
  memberships: Membership[],
  options: DashboardCalculationOptions = {}
) {
  const asOf = options.asOf ?? new Date()
  const monthlyWindowDays = options.expiringMonthlyWindowDays ?? 7
  const annualWindowDays = options.expiringAnnualWindowDays ?? 30

  return memberships.filter((membership) => {
    if (membership.status !== "ACTIVE") {
      return false
    }

    const daysRemaining = getDaysBetween(asOf, membership.currentPeriodEndsAt)
    const windowDays =
      membership.billingInterval === "ANNUAL"
        ? annualWindowDays
        : monthlyWindowDays

    return daysRemaining >= 0 && daysRemaining <= windowDays
  })
}

export function getOverduePayments(
  payments: MembershipPayment[],
  asOf = new Date()
) {
  return payments.filter((payment) => {
    return (
      payment.status === "OVERDUE" ||
      (payment.status === "PENDING" && new Date(payment.dueAt) < asOf)
    )
  })
}

export function getInactiveMembers(
  members: Member[],
  options: DashboardCalculationOptions = {}
) {
  const asOf = options.asOf ?? new Date()
  const inactiveWindowDays = options.inactiveWindowDays ?? 30

  return members.filter((member) => {
    if (member.status !== "INACTIVE") {
      return false
    }

    if (!member.lastAttendedAt) {
      return true
    }

    return getDaysBetween(member.lastAttendedAt, asOf) >= inactiveWindowDays
  })
}

export function getDropInConversionOpportunities(
  dropIns: DropInVisit[],
  options: DashboardCalculationOptions = {}
) {
  const asOf = options.asOf ?? new Date()
  const threshold = options.conversionVisitThreshold ?? 5
  const visitors = new Map<string, DropInConversionOpportunity>()

  for (const dropIn of dropIns) {
    if (!isSameMonth(dropIn.visitedAt, asOf)) {
      continue
    }

    if (!dropIn.visitorName || !dropIn.visitorContact) {
      continue
    }

    const key = dropIn.visitorContact.toLowerCase()
    const existing = visitors.get(key) ?? {
      visitorName: dropIn.visitorName,
      visitorContact: dropIn.visitorContact,
      visitCount: 0,
      revenueAmount: 0,
    }

    existing.visitCount += dropIn.visitCount
    existing.revenueAmount += dropIn.amount
    visitors.set(key, existing)
  }

  return Array.from(visitors.values()).filter(
    (visitor) => visitor.visitCount >= threshold
  )
}

export function getNewSignUpsThisMonth(members: Member[], asOf = new Date()) {
  return members.filter((member) => isSameMonth(member.joinDate, asOf)).length
}

export function getMembersWithMemberships(
  data: DashboardData
): MemberWithMembership[] {
  const membershipByMemberId = new Map(
    data.memberships.map((membership) => [membership.memberId, membership])
  )
  const planById = new Map(data.planTiers.map((plan) => [plan.id, plan]))
  const attendanceCountByMemberId = new Map<string, number>()

  for (const record of data.attendance) {
    attendanceCountByMemberId.set(
      record.memberId,
      (attendanceCountByMemberId.get(record.memberId) ?? 0) + 1
    )
  }

  return data.members.map((member) => {
    const membership = membershipByMemberId.get(member.id)

    return {
      ...member,
      membership,
      planTier: membership ? planById.get(membership.planTierId) : undefined,
      sessionsAttended: attendanceCountByMemberId.get(member.id) ?? 0,
    }
  })
}

export function getDashboardAlerts(
  data: DashboardData,
  options: DashboardCalculationOptions = {}
): DashboardAlert[] {
  const asOf = options.asOf ?? new Date()
  const membersById = new Map(data.members.map((member) => [member.id, member]))
  const membershipsById = new Map(
    data.memberships.map((membership) => [membership.id, membership])
  )

  const expiringMemberships: DashboardAlert[] = getExpiringMemberships(
    data.memberships,
    {
      ...options,
      asOf,
    }
  ).map((membership) => {
    const member = membersById.get(membership.memberId)

    return {
      id: `expiring-${membership.id}`,
      type: "EXPIRING_MEMBERSHIP",
      severity: "warning",
      title: `${formatMemberName(member)} renews soon`,
      detail: `Membership ends ${formatDate(membership.currentPeriodEndsAt)}.`,
      memberId: membership.memberId,
      membershipId: membership.id,
      dueAt: membership.currentPeriodEndsAt,
    } satisfies DashboardAlert
  })

  const overduePayments: DashboardAlert[] = getOverduePayments(
    data.payments,
    asOf
  ).map((payment) => {
    const member = membersById.get(payment.memberId)

    return {
      id: `overdue-${payment.id}`,
      type: "OVERDUE_PAYMENT",
      severity: "critical",
      title: `${formatMemberName(member)} has overdue payment`,
      detail: `${formatCurrency(payment.amount, data.gym.currencyCode)} due ${formatDate(payment.dueAt)}.`,
      memberId: payment.memberId,
      membershipId: payment.membershipId,
      paymentId: payment.id,
      dueAt: payment.dueAt,
    } satisfies DashboardAlert
  })

  const inactiveMembers: DashboardAlert[] = getInactiveMembers(data.members, {
    ...options,
    asOf,
  }).map((member) => {
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
  })

  const conversionOpportunities: DashboardAlert[] =
    getDropInConversionOpportunities(data.dropIns, {
      ...options,
      asOf,
    }).map((visitor) => {
      return {
        id: `conversion-${visitor.visitorContact}`,
        type: "DROP_IN_CONVERSION",
        severity: "opportunity",
        title: `${visitor.visitorName} is ready for follow-up`,
        detail: `${visitor.visitCount} drop-in visits this month, ${formatCurrency(
          visitor.revenueAmount,
          data.gym.currencyCode
        )} paid.`,
        visitorContact: visitor.visitorContact,
      } satisfies DashboardAlert
    })

  return [
    ...overduePayments,
    ...expiringMemberships,
    ...inactiveMembers,
    ...conversionOpportunities,
  ].sort((left, right) => {
    const leftMembership = left.membershipId
      ? membershipsById.get(left.membershipId)
      : undefined
    const rightMembership = right.membershipId
      ? membershipsById.get(right.membershipId)
      : undefined
    const leftDate = left.dueAt ?? leftMembership?.nextBillingDate ?? ""
    const rightDate = right.dueAt ?? rightMembership?.nextBillingDate ?? ""

    return leftDate.localeCompare(rightDate)
  })
}

export function getDashboardSummary(
  data: DashboardData,
  options: DashboardCalculationOptions = {}
): DashboardSummary {
  const asOf = options.asOf ?? new Date()
  const memberCounts = getMemberCounts(data.members)
  const membershipMrrAmount = calculateMembershipMrr(data.memberships)
  const dropInRevenueThisMonthAmount = calculateDropInRevenueForMonth(
    data.dropIns,
    asOf
  )
  const expiringMemberships = getExpiringMemberships(data.memberships, {
    ...options,
    asOf,
  })
  const overduePayments = getOverduePayments(data.payments, asOf)
  const inactiveMembers = getInactiveMembers(data.members, {
    ...options,
    asOf,
  })
  const conversionOpportunities = getDropInConversionOpportunities(
    data.dropIns,
    {
      ...options,
      asOf,
    }
  )

  return {
    asOf: asOf.toISOString(),
    currencyCode: data.gym.currencyCode,
    ...memberCounts,
    newSignUpsThisMonth: getNewSignUpsThisMonth(data.members, asOf),
    membershipMrrAmount,
    dropInRevenueThisMonthAmount,
    totalRevenueThisMonthAmount:
      membershipMrrAmount + dropInRevenueThisMonthAmount,
    expiringMembershipsCount: expiringMemberships.length,
    overduePaymentsCount: overduePayments.length,
    inactiveMembersCount: inactiveMembers.length,
    dropInConversionOpportunitiesCount: conversionOpportunities.length,
  }
}

function isSameMonth(date: string, month: Date) {
  const value = new Date(date)

  return (
    value.getUTCFullYear() === month.getUTCFullYear() &&
    value.getUTCMonth() === month.getUTCMonth()
  )
}

function getDaysBetween(start: Date | string, end: Date | string) {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  return Math.floor((endTime - startTime) / MS_PER_DAY)
}

function formatMemberName(member?: Pick<Member, "firstName" | "lastName">) {
  if (!member) {
    return "Member"
  }

  return `${member.firstName} ${member.lastName}`
}

function formatDate(date: string) {
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
