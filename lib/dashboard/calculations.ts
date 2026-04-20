import type { Membership } from "@/lib/dashboard/types"

const MS_PER_DAY = 24 * 60 * 60 * 1000
type DateValue = Date | string

export type DashboardCalculationOptions = {
  asOf?: Date
  expiringMonthlyWindowDays?: number
  expiringAnnualWindowDays?: number
}

export type MembershipDisplayStatus =
  | "active"
  | "expiring"
  | "expired"
  | "past_due"
  | "canceled"

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

export function isExpired(
  membership: {
    currentPeriodEndsAt: DateValue
    status: Membership["status"]
  },
  asOf: Date
) {
  return (
    membership.status === "ACTIVE" &&
    new Date(membership.currentPeriodEndsAt).getTime() < asOf.getTime()
  )
}

export function getMembershipDisplayStatus(
  membership: {
    billingInterval: Membership["billingInterval"]
    currentPeriodEndsAt: DateValue
    status: Membership["status"]
  },
  asOf: Date,
  options: Pick<
    DashboardCalculationOptions,
    "expiringMonthlyWindowDays" | "expiringAnnualWindowDays"
  > = {}
): MembershipDisplayStatus {
  if (membership.status === "PAST_DUE") {
    return "past_due"
  }

  if (membership.status === "CANCELED") {
    return "canceled"
  }

  if (membership.status === "EXPIRED" || isExpired(membership, asOf)) {
    return "expired"
  }

  const monthlyWindowDays = options.expiringMonthlyWindowDays ?? 7
  const annualWindowDays = options.expiringAnnualWindowDays ?? 30
  const daysRemaining = getDaysBetween(asOf, membership.currentPeriodEndsAt)
  const windowDays =
    membership.billingInterval === "ANNUAL"
      ? annualWindowDays
      : monthlyWindowDays

  return daysRemaining >= 0 && daysRemaining <= windowDays
    ? "expiring"
    : "active"
}

export function getCurrentDisplayMembership<
  T extends {
    status: Membership["status"]
  },
>(memberships: T[]) {
  return memberships.find(
    (membership) =>
      membership.status === "ACTIVE" || membership.status === "EXPIRED"
  )
}

export function getExpiringMembershipPeriodText(daysRemaining: number) {
  if (daysRemaining === 0) {
    return "Expires today."
  }

  return daysRemaining === 1
    ? "Expires in 1 day."
    : `Expires in ${daysRemaining} days.`
}

export function getDaysBetween(start: Date | string, end: Date | string) {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  return Math.floor((endTime - startTime) / MS_PER_DAY)
}
