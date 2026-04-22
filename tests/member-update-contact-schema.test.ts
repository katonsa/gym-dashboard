import { expect, test } from "vitest"

import { updateMemberContactSchema } from "../lib/members/schemas/update-contact-schema.ts"

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

  expect(parsed.success).toBe(true)

  if (parsed.success) {
    expect(parsed.data.firstName).toBe("Ari")
    expect(parsed.data.lastName).toBe("Santoso")
    expect(parsed.data.phone).toBe("+62 812 5555")
    expect(parsed.data.notes).toBe("Prefers WhatsApp.")
  }
})

test("coerces cleared optional contact values to null", () => {
  const parsed = updateMemberContactSchema.safeParse({
    ...validValues,
    email: "",
    phone: "",
    notes: "",
  })

  expect(parsed.success).toBe(true)

  if (parsed.success) {
    expect(parsed.data.email).toBe(null)
    expect(parsed.data.phone).toBe(null)
    expect(parsed.data.notes).toBe(null)
  }
})

test("rejects invalid email", () => {
  const parsed = updateMemberContactSchema.safeParse({
    ...validValues,
    email: "not-an-email",
  })

  expect(parsed.success).toBe(false)
})

test("rejects blank required names", () => {
  expect(
    updateMemberContactSchema.safeParse({
      ...validValues,
      firstName: " ",
    }).success
  ).toBe(false)
  expect(
    updateMemberContactSchema.safeParse({
      ...validValues,
      lastName: " ",
    }).success
  ).toBe(false)
})

test("rejects contact values over length limits", () => {
  expect(
    updateMemberContactSchema.safeParse({
      ...validValues,
      firstName: "x".repeat(101),
    }).success
  ).toBe(false)
  expect(
    updateMemberContactSchema.safeParse({
      ...validValues,
      lastName: "x".repeat(101),
    }).success
  ).toBe(false)
  expect(
    updateMemberContactSchema.safeParse({
      ...validValues,
      email: `${"x".repeat(244)}@example.test`,
    }).success
  ).toBe(false)
  expect(
    updateMemberContactSchema.safeParse({
      ...validValues,
      phone: "x".repeat(51),
    }).success
  ).toBe(false)
  expect(
    updateMemberContactSchema.safeParse({
      ...validValues,
      notes: "x".repeat(1001),
    }).success
  ).toBe(false)
})
