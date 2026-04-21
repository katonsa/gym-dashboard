import { expect, test } from "vitest"

import { renewMembershipSchema } from "../lib/dashboard/schemas/renew-membership-schema.ts"

const validValues = {
  membershipId: "membership-1",
  expectedStatus: "ACTIVE",
  expectedCurrentPeriodEndsAt: "2026-04-30T00:00:00.000Z",
  submissionId: "1f50a97f-71f8-4c3e-98ce-c0ac19d810b9",
  renewalDate: "2026-04-19",
}

test("accepts complete renewal values", () => {
  expect(renewMembershipSchema.safeParse(validValues).success).toBe(true)
})

test("accepts omitted renewal date", () => {
  expect(
    renewMembershipSchema.safeParse({
      ...validValues,
      renewalDate: undefined,
    }).success
  ).toBe(true)
})

test("rejects invalid renewal status, stale date, submission id, and renewal date", () => {
  expect(
    renewMembershipSchema.safeParse({
      ...validValues,
      expectedStatus: "PAST_DUE",
    }).success
  ).toBe(false)
  expect(
    renewMembershipSchema.safeParse({
      ...validValues,
      expectedCurrentPeriodEndsAt: "not-a-date",
    }).success
  ).toBe(false)
  expect(
    renewMembershipSchema.safeParse({
      ...validValues,
      submissionId: "not-a-uuid",
    }).success
  ).toBe(false)
  expect(
    renewMembershipSchema.safeParse({
      ...validValues,
      renewalDate: "2026-02-31",
    }).success
  ).toBe(false)
})
