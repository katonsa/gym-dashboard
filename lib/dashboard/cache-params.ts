import { DASHBOARD_CACHE_TTL_SECONDS } from "@/lib/cache/redis"
import type { OverviewAggregateOptions } from "@/lib/dashboard/aggregate-types"

export const CURRENT_DASHBOARD_CACHE_WINDOW_MS =
  DASHBOARD_CACHE_TTL_SECONDS * 1000

export function getDashboardTimeCacheParam(
  value?: Date,
  now = new Date()
): string {
  if (!value) {
    return "current"
  }

  return isCurrentDashboardInstant(value, now)
    ? "current"
    : value.toISOString()
}

export function getAggregateCacheParams(
  options: OverviewAggregateOptions,
  now = new Date()
) {
  return {
    asOf: getDashboardTimeCacheParam(options.asOf, now),
    membershipAsOf: options.membershipAsOf
      ? getDashboardTimeCacheParam(options.membershipAsOf, now)
      : null,
    expiringMonthlyWindowDays: options.expiringMonthlyWindowDays ?? null,
    expiringAnnualWindowDays: options.expiringAnnualWindowDays ?? null,
    inactiveWindowDays: options.inactiveWindowDays ?? null,
    conversionVisitThreshold: options.conversionVisitThreshold ?? null,
    alertLimit: options.alertLimit ?? null,
  }
}

function isCurrentDashboardInstant(value: Date, now: Date) {
  return (
    Math.abs(now.getTime() - value.getTime()) <=
    CURRENT_DASHBOARD_CACHE_WINDOW_MS
  )
}
