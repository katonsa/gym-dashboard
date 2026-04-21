import { expect, test } from "vitest"

import { logCheckInSchema } from "../lib/dashboard/schemas/log-checkin-schema.ts"

const validValues = {
  memberId: "member-1",
  attendedAt: "2026-04-18",
  notes: "Evening strength session.",
}

test("accepts complete member check-in values", () => {
  expect(logCheckInSchema.safeParse(validValues).success).toBe(true)
})

test("accepts check-in values without notes", () => {
  expect(
    logCheckInSchema.safeParse({
      memberId: "member-1",
      attendedAt: "2026-04-18",
    }).success
  ).toBe(true)
})

test("rejects a missing member", () => {
  const parsed = logCheckInSchema.safeParse({
    ...validValues,
    memberId: "",
  })

  expect(parsed.success).toBe(false)
})

test("rejects an invalid check-in date", () => {
  const parsed = logCheckInSchema.safeParse({
    ...validValues,
    attendedAt: "2026-02-31",
  })

  expect(parsed.success).toBe(false)
})

test("rejects a future check-in date", () => {
  const parsed = logCheckInSchema.safeParse({
    ...validValues,
    attendedAt: "2099-01-01",
  })

  expect(parsed.success).toBe(false)
})

test("rejects notes over 500 characters", () => {
  const parsed = logCheckInSchema.safeParse({
    ...validValues,
    notes: "x".repeat(501),
  })

  expect(parsed.success).toBe(false)
})
