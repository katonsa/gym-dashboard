import { expect, test } from "vitest"

import { markPaidSchema } from "../lib/dashboard/schemas/mark-paid-schema.ts"
import { voidPaymentSchema } from "../lib/dashboard/schemas/void-payment-schema.ts"

test("validates mark-paid payment ids", () => {
  expect(markPaidSchema.parse({ paymentId: " payment-1 " })).toStrictEqual({
    paymentId: "payment-1",
  })
  expect(markPaidSchema.safeParse({ paymentId: " " }).success).toBe(false)
})

test("validates void payment ids and optional reasons", () => {
  expect(
    voidPaymentSchema.parse({
      paymentId: " payment-1 ",
      reason: " duplicate invoice ",
    })
  ).toStrictEqual({
    paymentId: "payment-1",
    reason: "duplicate invoice",
  })
  expect(
    voidPaymentSchema.safeParse({
      paymentId: "payment-1",
      reason: "x".repeat(501),
    }).success
  ).toBe(false)
})
