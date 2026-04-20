import assert from "node:assert/strict"
import test from "node:test"

import { createMemberSchema } from "../lib/dashboard/schemas/member-create-schema.ts"

const validValues = {
  firstName: "Ari",
  lastName: "Santoso",
  email: "ari@example.test",
  phone: "+62 812 5555",
  status: "ACTIVE",
  joinDate: "2026-04-18",
  planTierId: "",
  billingInterval: "MONTHLY",
  notes: "Prefers WhatsApp.",
}

test("member creation accepts shared contact values at edit limits", () => {
  const parsed = createMemberSchema.safeParse({
    ...validValues,
    firstName: "x".repeat(100),
    lastName: "x".repeat(100),
    email: `${"x".repeat(242)}@example.test`,
    phone: "x".repeat(50),
    notes: "x".repeat(1000),
  })

  assert.equal(parsed.success, true)
})

test("member creation rejects shared contact values over edit limits", () => {
  assert.equal(
    createMemberSchema.safeParse({
      ...validValues,
      firstName: "x".repeat(101),
    }).success,
    false
  )
  assert.equal(
    createMemberSchema.safeParse({
      ...validValues,
      lastName: "x".repeat(101),
    }).success,
    false
  )
  assert.equal(
    createMemberSchema.safeParse({
      ...validValues,
      email: `${"x".repeat(244)}@example.test`,
    }).success,
    false
  )
  assert.equal(
    createMemberSchema.safeParse({
      ...validValues,
      phone: "x".repeat(51),
    }).success,
    false
  )
  assert.equal(
    createMemberSchema.safeParse({
      ...validValues,
      notes: "x".repeat(1001),
    }).success,
    false
  )
})
