import { expect, test } from "vitest"

import { addBillingPeriod, addMonthsClamped } from "../lib/dashboard/billing.ts"

test("adds a monthly billing period and clamps to February in a leap year", () => {
  expect(isoDate(addBillingPeriod(utcDate(2024, 1, 31), "MONTHLY"))).toBe(
    "2024-02-29"
  )
})

test("adds a monthly billing period and clamps to February in a common year", () => {
  expect(isoDate(addBillingPeriod(utcDate(2023, 1, 31), "MONTHLY"))).toBe(
    "2023-02-28"
  )
})

test("adds an annual billing period and clamps leap day to February 28", () => {
  expect(isoDate(addBillingPeriod(utcDate(2024, 2, 29), "ANNUAL"))).toBe(
    "2025-02-28"
  )
})

test("adds months across a year boundary without changing valid month-end dates", () => {
  expect(isoDate(addMonthsClamped(utcDate(2025, 12, 31), 1))).toBe("2026-01-31")
})

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day))
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}
