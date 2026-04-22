import type { BillingInterval } from "@/lib/domain/types"

export function addBillingPeriod(date: Date, billingInterval: BillingInterval) {
  return addMonthsClamped(date, billingInterval === "ANNUAL" ? 12 : 1)
}

export function addMonthsClamped(date: Date, monthCount: number) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const targetMonth = month + monthCount
  const targetYear = year + Math.floor(targetMonth / 12)
  const normalizedTargetMonth = ((targetMonth % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, normalizedTargetMonth + 1, 0)
  ).getUTCDate()
  const day = Math.min(date.getUTCDate(), lastDayOfTargetMonth)

  return new Date(Date.UTC(targetYear, normalizedTargetMonth, day))
}
