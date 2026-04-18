import assert from "node:assert/strict"
import test from "node:test"

import { addBillingPeriod, addMonthsClamped } from "../lib/dashboard/billing.ts"

test("adds a monthly billing period and clamps to February in a leap year", () => {
  assert.equal(
    isoDate(addBillingPeriod(utcDate(2024, 1, 31), "MONTHLY")),
    "2024-02-29"
  )
})

test("adds a monthly billing period and clamps to February in a common year", () => {
  assert.equal(
    isoDate(addBillingPeriod(utcDate(2023, 1, 31), "MONTHLY")),
    "2023-02-28"
  )
})

test("adds an annual billing period and clamps leap day to February 28", () => {
  assert.equal(
    isoDate(addBillingPeriod(utcDate(2024, 2, 29), "ANNUAL")),
    "2025-02-28"
  )
})

test("adds months across a year boundary without changing valid month-end dates", () => {
  assert.equal(
    isoDate(addMonthsClamped(utcDate(2025, 12, 31), 1)),
    "2026-01-31"
  )
})

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day))
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}
