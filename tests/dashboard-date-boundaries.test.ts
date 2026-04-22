import { expect, test } from "vitest"

import {
  getGymLocalDateInput,
  getGymLocalDayBoundary,
  getGymLocalDayWindow,
  getGymLocalMonthWindow,
} from "../lib/domain/date-boundaries.ts"

test("normalizes an instant to the start of the gym-local day", () => {
  expect(
    getGymLocalDayBoundary(
      new Date("2026-04-19T09:30:00.000Z"),
      "Asia/Jakarta"
    ).toISOString()
  ).toBe("2026-04-18T17:00:00.000Z")
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

  expect(periodEnd >= sameGymDay).toBe(true)
  expect(periodEnd < nextGymDay).toBe(true)
})

test("formats the gym-local date input for a non-UTC timezone", () => {
  expect(
    getGymLocalDateInput(new Date("2026-04-18T18:30:00.000Z"), "Asia/Jakarta")
  ).toBe("2026-04-19")
})

test("builds a gym-local day window", () => {
  expect(
    getIsoWindow(
      getGymLocalDayWindow(new Date("2026-04-19T09:30:00.000Z"), "Asia/Jakarta")
    )
  ).toStrictEqual({
    start: "2026-04-18T17:00:00.000Z",
    end: "2026-04-19T17:00:00.000Z",
  })
})

test("builds a gym-local month window", () => {
  expect(
    getIsoWindow(
      getGymLocalMonthWindow(
        new Date("2026-04-30T18:30:00.000Z"),
        "Asia/Jakarta"
      )
    )
  ).toStrictEqual({
    start: "2026-04-30T17:00:00.000Z",
    end: "2026-05-31T17:00:00.000Z",
  })
})

function getIsoWindow(window: { start: Date; end: Date }) {
  return {
    start: window.start.toISOString(),
    end: window.end.toISOString(),
  }
}
