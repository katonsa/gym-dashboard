import assert from "node:assert/strict"
import test from "node:test"

import { markPaidSchema } from "../app/(dashboard)/members/mark-paid-schema.ts"
import { voidPaymentSchema } from "../app/(dashboard)/members/void-payment-schema.ts"

test("validates mark-paid payment ids", () => {
  assert.deepEqual(markPaidSchema.parse({ paymentId: " payment-1 " }), {
    paymentId: "payment-1",
  })
  assert.equal(markPaidSchema.safeParse({ paymentId: " " }).success, false)
})

test("validates void payment ids and optional reasons", () => {
  assert.deepEqual(
    voidPaymentSchema.parse({
      paymentId: " payment-1 ",
      reason: " duplicate invoice ",
    }),
    {
      paymentId: "payment-1",
      reason: "duplicate invoice",
    }
  )
  assert.equal(
    voidPaymentSchema.safeParse({
      paymentId: "payment-1",
      reason: "x".repeat(501),
    }).success,
    false
  )
})
