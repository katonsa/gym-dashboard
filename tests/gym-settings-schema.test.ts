import assert from "node:assert/strict"
import test from "node:test"

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

  assert.equal(parsed.success, true)

  if (parsed.success) {
    assert.equal(parsed.data.name, "Jakarta Strength Club")
    assert.equal(parsed.data.currencyCode, "IDR")
    assert.equal(parsed.data.defaultDropInFeeAmount, "150000")
  }
})

test("normalizes valid gym settings for persistence", () => {
  const parsed = updateGymSettingsSchema.safeParse(validValues)

  assert.equal(parsed.success, true)

  if (parsed.success) {
    assert.deepEqual(normalizeGymSettingsValues(parsed.data), {
      name: "Jakarta Strength Club",
      timezone: "Asia/Jakarta",
      currencyCode: "IDR",
      defaultDropInFeeAmount: 150000,
    })
  }
})

test("rejects unsupported timezone and currency values", () => {
  assert.equal(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      timezone: "Mars/Base",
    }).success,
    false
  )
  assert.equal(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      currencyCode: "ABC",
    }).success,
    false
  )
})

test("rejects blank and long gym names", () => {
  assert.equal(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      name: " ",
    }).success,
    false
  )
  assert.equal(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      name: "x".repeat(101),
    }).success,
    false
  )
})

test("rejects invalid default drop-in fees", () => {
  assert.equal(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      defaultDropInFeeAmount: "",
    }).success,
    false
  )
  assert.equal(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      defaultDropInFeeAmount: "10.5",
    }).success,
    false
  )
  assert.equal(
    updateGymSettingsSchema.safeParse({
      ...validValues,
      defaultDropInFeeAmount: "10000001",
    }).success,
    false
  )
})
