import type { Membership } from "@/lib/dashboard/types"

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

function getDaysBetween(start: Date | string, end: Date | string) {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  return Math.floor((endTime - startTime) / MS_PER_DAY)
}
