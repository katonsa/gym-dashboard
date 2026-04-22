import { expect, test } from "vitest"

import {
  CURRENT_DASHBOARD_CACHE_WINDOW_MS,
  getAggregateCacheParams,
  getDashboardTimeCacheParam,
} from "../lib/dashboard/read-models/cache-params.ts"

test("uses a stable current cache key for near-now dashboard reads", () => {
  const now = new Date("2026-04-22T10:00:00.000Z")
  const asOf = new Date(now.getTime() - CURRENT_DASHBOARD_CACHE_WINDOW_MS + 500)

  expect(getDashboardTimeCacheParam(asOf, now)).toBe("current")
})

test("keeps historical dashboard reads keyed by exact timestamp", () => {
  const now = new Date("2026-04-22T10:00:00.000Z")
  const asOf = new Date(now.getTime() - CURRENT_DASHBOARD_CACHE_WINDOW_MS - 1)

  expect(getDashboardTimeCacheParam(asOf, now)).toBe(asOf.toISOString())
})

test("builds stable aggregate cache params for current dashboard reads", () => {
  const now = new Date("2026-04-22T10:00:00.000Z")

  expect(
    getAggregateCacheParams(
      {
        asOf: new Date(now.getTime() - 2_000),
        expiringMonthlyWindowDays: 7,
        conversionVisitThreshold: 5,
      },
      now
    )
  ).toStrictEqual({
    asOf: "current",
    membershipAsOf: null,
    expiringMonthlyWindowDays: 7,
    expiringAnnualWindowDays: null,
    inactiveWindowDays: null,
    conversionVisitThreshold: 5,
    alertLimit: null,
  })
})

test("preserves exact timestamps for historical aggregate cache params", () => {
  const now = new Date("2026-04-22T10:00:00.000Z")
  const asOf = new Date("2026-03-15T10:00:00.000Z")
  const membershipAsOf = new Date("2026-03-14T17:00:00.000Z")

  expect(
    getAggregateCacheParams(
      {
        asOf,
        membershipAsOf,
        alertLimit: 25,
      },
      now
    )
  ).toStrictEqual({
    asOf: asOf.toISOString(),
    membershipAsOf: membershipAsOf.toISOString(),
    expiringMonthlyWindowDays: null,
    expiringAnnualWindowDays: null,
    inactiveWindowDays: null,
    conversionVisitThreshold: null,
    alertLimit: 25,
  })
})
