import type {
  DashboardData,
  MemberWithMembership,
  Membership,
  MembershipPayment,
} from "@/lib/dashboard/types"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type DashboardCalculationOptions = {
  asOf?: Date
  expiringMonthlyWindowDays?: number
  expiringAnnualWindowDays?: number
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

function getDaysBetween(start: Date | string, end: Date | string) {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  return Math.floor((endTime - startTime) / MS_PER_DAY)
}
