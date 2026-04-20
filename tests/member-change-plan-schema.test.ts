import assert from "node:assert/strict"
import test from "node:test"

import { changePlanSchema } from "../lib/dashboard/schemas/change-plan-schema.ts"

const validValues = {
  memberId: "member-1",
  planTierId: "plan-1",
  billingInterval: "MONTHLY",
  effectiveDate: "2026-04-18",
}

test("accepts complete member plan change values", () => {
  assert.equal(changePlanSchema.safeParse(validValues).success, true)
})

test("rejects a missing plan tier", () => {
  const parsed = changePlanSchema.safeParse({
    ...validValues,
    planTierId: "",
  })

  assert.equal(parsed.success, false)
})

test("rejects an invalid billing interval", () => {
  const parsed = changePlanSchema.safeParse({
    ...validValues,
    billingInterval: "WEEKLY",
  })

  assert.equal(parsed.success, false)
})

test("rejects an invalid effective date", () => {
  const parsed = changePlanSchema.safeParse({
    ...validValues,
    effectiveDate: "2026-02-31",
  })

  assert.equal(parsed.success, false)
})
