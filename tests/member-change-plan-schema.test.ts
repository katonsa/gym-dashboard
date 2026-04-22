import { expect, test } from "vitest"

import { changePlanSchema } from "../lib/memberships/schemas/change-plan-schema.ts"

const validValues = {
  memberId: "member-1",
  planTierId: "plan-1",
  billingInterval: "MONTHLY",
  effectiveDate: "2026-04-18",
}

test("accepts complete member plan change values", () => {
  expect(changePlanSchema.safeParse(validValues).success).toBe(true)
})

test("rejects a missing plan tier", () => {
  const parsed = changePlanSchema.safeParse({
    ...validValues,
    planTierId: "",
  })

  expect(parsed.success).toBe(false)
})

test("rejects an invalid billing interval", () => {
  const parsed = changePlanSchema.safeParse({
    ...validValues,
    billingInterval: "WEEKLY",
  })

  expect(parsed.success).toBe(false)
})

test("rejects an invalid effective date", () => {
  const parsed = changePlanSchema.safeParse({
    ...validValues,
    effectiveDate: "2026-02-31",
  })

  expect(parsed.success).toBe(false)
})
