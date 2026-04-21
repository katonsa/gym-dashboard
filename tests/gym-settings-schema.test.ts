import { expect, test } from "vitest"

import {
  normalizeGymSettingsValues,
  updateGymSettingsSchema,
} from "../lib/dashboard/schemas/gym-settings-schema.ts"

const validValues = {
  name: "Jakarta Strength Club",
  timezone: "Asia/Jakarta",
  currencyCode: "IDR",
  defaultDropInFeeAmount: "150000",
}

test("trims gym settings and uppercases currency codes", () => {
  const parsed = updateGymSettingsSchema.safeParse({
    ...validValues,
    name: "  Jakarta Strength Club  ",
    currencyCode: " idr ",
    defaultDropInFeeAmount: " 150000 ",
  })

  expect(parsed.success).toBe(true)

  if (parsed.success) {
    expect(parsed.data.name).toBe("Jakarta Strength Club")
    expect(parsed.data.currencyCode).toBe("IDR")
    expect(parsed.data.defaultDropInFeeAmount).toBe("150000")
  }
})

test("normalizes valid gym settings for persistence", () => {
  const parsed = updateGymSettingsSchema.safeParse(validValues)

  expect(parsed.success).toBe(true)

  if (parsed.success) {
    expect(normalizeGymSettingsValues(parsed.data)).toStrictEqual({
      name: "Jakarta Strength Club",
      timezone: "Asia/Jakarta",
      currencyCode: "IDR",
      defaultDropInFeeAmount: 150000,
    })
  }
})

test("rejects unsupported timezone and currency values", () => {
  expect(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      timezone: "Mars/Base",
    }).success
  ).toBe(false)
  expect(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      currencyCode: "ABC",
    }).success
  ).toBe(false)
})

test("rejects blank and long gym names", () => {
  expect(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      name: " ",
    }).success
  ).toBe(false)
  expect(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      name: "x".repeat(101),
    }).success
  ).toBe(false)
})

test("rejects invalid default drop-in fees", () => {
  expect(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      defaultDropInFeeAmount: "",
    }).success
  ).toBe(false)
  expect(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      defaultDropInFeeAmount: "10.5",
    }).success
  ).toBe(false)
  expect(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      defaultDropInFeeAmount: "10000001",
    }).success
  ).toBe(false)
})
