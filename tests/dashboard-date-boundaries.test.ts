import assert from "node:assert/strict"
import test from "node:test"

import {
  getGymLocalDateInput,
  getGymLocalDayBoundary,
} from "../lib/dashboard/date-boundaries.ts"

test("normalizes an instant to the start of the gym-local day", () => {
  assert.equal(
    getGymLocalDayBoundary(
      new Date("2026-04-19T09:30:00.000Z"),
      "Asia/Jakarta"
    ).toISOString(),
    "2026-04-18T17:00:00.000Z"
  )
})

test("keeps a UTC-midnight membership current through its gym-local date", () => {
  const periodEnd = new Date("2026-04-19T00:00:00.000Z")
  const sameGymDay = getGymLocalDayBoundary(
    new Date("2026-04-19T09:30:00.000Z"),
    "Asia/Jakarta"
  )
  const nextGymDay = getGymLocalDayBoundary(
    new Date("2026-04-20T09:30:00.000Z"),
    "Asia/Jakarta"
  )

  assert.equal(periodEnd >= sameGymDay, true)
  assert.equal(periodEnd < nextGymDay, true)
})

test("formats the gym-local date input for a non-UTC timezone", () => {
  assert.equal(
    getGymLocalDateInput(new Date("2026-04-18T18:30:00.000Z"), "Asia/Jakarta"),
    "2026-04-19"
  )
})
