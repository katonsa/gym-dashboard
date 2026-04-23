import { expect, test } from "vitest"

import {
  changeEmailSchema,
  changePasswordSchema,
} from "../lib/auth/schemas/account-settings-schema.ts"

test("normalizes account email changes to trimmed lowercase values", () => {
  const parsed = changeEmailSchema.safeParse({
    newEmail: "  OWNER+NEW@Example.TEST  ",
    currentPassword: "owner-password-123",
  })

  expect(parsed.success).toBe(true)

  if (parsed.success) {
    expect(parsed.data.newEmail).toBe("owner+new@example.test")
  }
})

test("rejects invalid account email changes", () => {
  expect(
    changeEmailSchema.safeParse({
      newEmail: " ",
      currentPassword: "owner-password-123",
    }).success
  ).toBe(false)
  expect(
    changeEmailSchema.safeParse({
      newEmail: "not-an-email",
      currentPassword: "owner-password-123",
    }).success
  ).toBe(false)
  expect(
    changeEmailSchema.safeParse({
      newEmail: "owner@example.test",
      currentPassword: "",
    }).success
  ).toBe(false)
})

test("enforces password confirmation and length limits", () => {
  expect(
    changePasswordSchema.safeParse({
      currentPassword: "owner-password-123",
      newPassword: "short",
      confirmPassword: "short",
    }).success
  ).toBe(false)
  expect(
    changePasswordSchema.safeParse({
      currentPassword: "owner-password-123",
      newPassword: "x".repeat(129),
      confirmPassword: "x".repeat(129),
    }).success
  ).toBe(false)
  expect(
    changePasswordSchema.safeParse({
      currentPassword: "owner-password-123",
      newPassword: "new-password-123",
      confirmPassword: "different-password-123",
    }).success
  ).toBe(false)
})
