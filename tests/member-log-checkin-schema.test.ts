import assert from "node:assert/strict"
import test from "node:test"

import { logCheckInSchema } from "../lib/dashboard/schemas/log-checkin-schema.ts"

const validValues = {
  memberId: "member-1",
  attendedAt: "2026-04-18",
  notes: "Evening strength session.",
}

test("accepts complete member check-in values", () => {
  assert.equal(logCheckInSchema.safeParse(validValues).success, true)
})

test("accepts check-in values without notes", () => {
  assert.equal(
    logCheckInSchema.safeParse({
      memberId: "member-1",
      attendedAt: "2026-04-18",
    }).success,
    true
  )
})

test("rejects a missing member", () => {
  const parsed = logCheckInSchema.safeParse({
    ...validValues,
    memberId: "",
  })

  assert.equal(parsed.success, false)
})

test("rejects an invalid check-in date", () => {
  const parsed = logCheckInSchema.safeParse({
    ...validValues,
    attendedAt: "2026-02-31",
  })

  assert.equal(parsed.success, false)
})

test("rejects a future check-in date", () => {
  const parsed = logCheckInSchema.safeParse({
    ...validValues,
    attendedAt: "2099-01-01",
  })

  assert.equal(parsed.success, false)
})

test("rejects notes over 500 characters", () => {
  const parsed = logCheckInSchema.safeParse({
    ...validValues,
    notes: "x".repeat(501),
  })

  assert.equal(parsed.success, false)
})
