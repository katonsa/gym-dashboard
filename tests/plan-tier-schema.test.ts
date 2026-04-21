import { expect, test } from "vitest"

import {
  createPlanTierSchema,
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

test("requires plan names and bounded whole-number prices", () => {
  expect(
    createPlanTierSchema.safeParse({
      ...validValues,
      name: "",
    }).success
  ).toBe(false)
  expect(
    createPlanTierSchema.safeParse({
      ...validValues,
      monthlyPriceAmount: "10.5",
    }).success
  ).toBe(false)
  expect(
    createPlanTierSchema.safeParse({
      ...validValues,
      annualPriceAmount: "10000001",
    }).success
  ).toBe(false)
})

test("requires bounded whole-number sort order", () => {
  expect(
    createPlanTierSchema.safeParse({
      ...validValues,
      sortOrder: "-1",
    }).success
  ).toBe(false)
  expect(
    createPlanTierSchema.safeParse({
      ...validValues,
      sortOrder: "10001",
    }).success
  ).toBe(false)
})

test("requires a plan id for updates", () => {
  expect(
    updatePlanTierSchema.safeParse({
      ...validValues,
      planTierId: "",
    }).success
  ).toBe(false)
  expect(
    updatePlanTierSchema.safeParse({
      ...validValues,
      planTierId: "plan-1",
    }).success
  ).toBe(true)
})
