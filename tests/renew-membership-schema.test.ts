import assert from "node:assert/strict"
import test from "node:test"

import { renewMembershipSchema } from "../app/(dashboard)/members/renew-membership-schema.ts"

const validValues = {
  membershipId: "membership-1",
  expectedStatus: "ACTIVE",
  expectedCurrentPeriodEndsAt: "2026-04-30T00:00:00.000Z",
  submissionId: "1f50a97f-71f8-4c3e-98ce-c0ac19d810b9",
  renewalDate: "2026-04-19",
}

test("accepts complete renewal values", () => {
  assert.equal(renewMembershipSchema.safeParse(validValues).success, true)
})

test("accepts omitted renewal date", () => {
  assert.equal(
    renewMembershipSchema.safeParse({
      ...validValues,
      renewalDate: undefined,
    }).success,
    true
  )
})

test("rejects invalid renewal status, stale date, submission id, and renewal date", () => {
  assert.equal(
    renewMembershipSchema.safeParse({
      ...validValues,
      expectedStatus: "PAST_DUE",
    }).success,
    false
  )
  assert.equal(
    renewMembershipSchema.safeParse({
      ...validValues,
      expectedCurrentPeriodEndsAt: "not-a-date",
    }).success,
    false
  )
  assert.equal(
    renewMembershipSchema.safeParse({
      ...validValues,
      submissionId: "not-a-uuid",
    }).success,
    false
  )
  assert.equal(
    renewMembershipSchema.safeParse({
      ...validValues,
      renewalDate: "2026-02-31",
    }).success,
    false
  )
})
