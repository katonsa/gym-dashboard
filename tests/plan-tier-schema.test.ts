import assert from "node:assert/strict"
import test from "node:test"

import {
  createPlanTierSchema,
  normalizePlanTierValues,
  updatePlanTierSchema,
} from "../lib/dashboard/schemas/plan-tier-schema.ts"

const validValues = {
  name: "Pro",
  description: "Open gym plus weekly group programming.",
  monthlyPriceAmount: "650000",
  annualPriceAmount: "6500000",
  sortOrder: "2",
  isActive: true,
}

test("normalizes valid plan tier values for persistence", () => {
  const parsed = createPlanTierSchema.safeParse({
    ...validValues,
    name: "  Pro  ",
    description: "  Open gym  ",
    monthlyPriceAmount: " 650000 ",
    annualPriceAmount: " 6500000 ",
    sortOrder: " 2 ",
  })

  assert.equal(parsed.success, true)

  if (parsed.success) {
    assert.deepEqual(normalizePlanTierValues(parsed.data), {
      name: "Pro",
      description: "Open gym",
      monthlyPriceAmount: 650000,
      annualPriceAmount: 6500000,
      sortOrder: 2,
      isActive: true,
    })
  }
})

test("converts blank plan descriptions to null", () => {
  const parsed = createPlanTierSchema.safeParse({
    ...validValues,
    description: " ",
  })

  assert.equal(parsed.success, true)

  if (parsed.success) {
    assert.equal(normalizePlanTierValues(parsed.data).description, null)
  }
})

test("requires plan names and bounded whole-number prices", () => {
  assert.equal(
    createPlanTierSchema.safeParse({
      ...validValues,
      name: "",
    }).success,
    false
  )
  assert.equal(
    createPlanTierSchema.safeParse({
      ...validValues,
      monthlyPriceAmount: "10.5",
    }).success,
    false
  )
  assert.equal(
    createPlanTierSchema.safeParse({
      ...validValues,
      annualPriceAmount: "10000001",
    }).success,
    false
  )
})

test("requires bounded whole-number sort order", () => {
  assert.equal(
    createPlanTierSchema.safeParse({
      ...validValues,
      sortOrder: "-1",
    }).success,
    false
  )
  assert.equal(
    createPlanTierSchema.safeParse({
      ...validValues,
      sortOrder: "10001",
    }).success,
    false
  )
})

test("requires a plan id for updates", () => {
  assert.equal(
    updatePlanTierSchema.safeParse({
      ...validValues,
      planTierId: "",
    }).success,
    false
  )
  assert.equal(
    updatePlanTierSchema.safeParse({
      ...validValues,
      planTierId: "plan-1",
    }).success,
    true
  )
})
