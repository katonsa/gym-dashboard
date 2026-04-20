import assert from "node:assert/strict"
import test from "node:test"

import { updateMemberContactSchema } from "../app/(dashboard)/members/update-member-contact-schema.ts"

const validValues = {
  memberId: "member-1",
  firstName: "Ari",
  lastName: "Santoso",
  email: "ari@example.test",
  phone: "+62 812 5555",
  notes: "Prefers WhatsApp.",
}

test("trims editable contact values", () => {
  const parsed = updateMemberContactSchema.safeParse({
    ...validValues,
    firstName: "  Ari  ",
    lastName: "  Santoso  ",
    phone: "  +62 812 5555  ",
    notes: "  Prefers WhatsApp.  ",
  })

  assert.equal(parsed.success, true)

  if (parsed.success) {
    assert.equal(parsed.data.firstName, "Ari")
    assert.equal(parsed.data.lastName, "Santoso")
    assert.equal(parsed.data.phone, "+62 812 5555")
    assert.equal(parsed.data.notes, "Prefers WhatsApp.")
  }
})

test("coerces cleared optional contact values to null", () => {
  const parsed = updateMemberContactSchema.safeParse({
    ...validValues,
    email: "",
    phone: "",
    notes: "",
  })

  assert.equal(parsed.success, true)

  if (parsed.success) {
    assert.equal(parsed.data.email, null)
    assert.equal(parsed.data.phone, null)
    assert.equal(parsed.data.notes, null)
  }
})

test("rejects invalid email", () => {
  const parsed = updateMemberContactSchema.safeParse({
    ...validValues,
    email: "not-an-email",
  })

  assert.equal(parsed.success, false)
})

test("rejects blank required names", () => {
  assert.equal(
    updateMemberContactSchema.safeParse({
      ...validValues,
      firstName: " ",
    }).success,
    false
  )
  assert.equal(
    updateMemberContactSchema.safeParse({
      ...validValues,
      lastName: " ",
    }).success,
    false
  )
})

test("rejects contact values over length limits", () => {
  assert.equal(
    updateMemberContactSchema.safeParse({
      ...validValues,
      firstName: "x".repeat(101),
    }).success,
    false
  )
  assert.equal(
    updateMemberContactSchema.safeParse({
      ...validValues,
      lastName: "x".repeat(101),
    }).success,
    false
  )
  assert.equal(
    updateMemberContactSchema.safeParse({
      ...validValues,
      email: `${"x".repeat(244)}@example.test`,
    }).success,
    false
  )
  assert.equal(
    updateMemberContactSchema.safeParse({
      ...validValues,
      phone: "x".repeat(51),
    }).success,
    false
  )
  assert.equal(
    updateMemberContactSchema.safeParse({
      ...validValues,
      notes: "x".repeat(1001),
    }).success,
    false
  )
})
