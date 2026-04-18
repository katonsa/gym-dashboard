import assert from "node:assert/strict"
import test from "node:test"

import {
  getAttendanceRecordsQuery,
  getDropInVisitsPageQuery,
  getDropInVisitsQuery,
  getMembersQuery,
  getMembershipPaymentsQuery,
  getMembershipsQuery,
  getOwnerGymQuery,
  getOverviewMembershipPaymentsQuery,
  getOverviewMembershipsQuery,
  getPlanTiersQuery,
  getSubscriptionMembershipsQuery,
} from "../lib/dashboard/query-scopes.ts"

test("selects the authenticated owner's first gym only", () => {
  assert.deepEqual(getOwnerGymQuery("owner-1"), {
    where: {
      ownerId: "owner-1",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      timezone: true,
      currencyCode: true,
      defaultDropInFeeAmount: true,
    },
  })
})

test("scopes gym-owned dashboard rows to the owner's gym id", () => {
  const gymId = "gym-1"

  assert.equal(getPlanTiersQuery(gymId).where.gymId, gymId)
  assert.equal(getMembersQuery(gymId).where.gymId, gymId)
  assert.equal(getMembershipPaymentsQuery(gymId).where.gymId, gymId)
  assert.equal(getOverviewMembershipPaymentsQuery(gymId).where.gymId, gymId)
  assert.equal(getAttendanceRecordsQuery(gymId).where.gymId, gymId)
  assert.equal(getDropInVisitsQuery(gymId).where.gymId, gymId)
  assert.equal(getDropInVisitsPageQuery(gymId, 25, 25).where.gymId, gymId)
})

test("scopes memberships through the owning member's gym", () => {
  const gymId = "gym-1"

  assert.deepEqual(getMembershipsQuery(gymId).where, {
    member: { gymId },
  })
  assert.deepEqual(getOverviewMembershipsQuery(gymId).where, {
    member: { gymId },
  })
  assert.deepEqual(getSubscriptionMembershipsQuery(gymId).where, {
    member: { gymId },
  })
})

test("builds a stable paginated drop-in query", () => {
  assert.deepEqual(getDropInVisitsPageQuery("gym-1", 25, 25), {
    where: { gymId: "gym-1" },
    orderBy: [{ visitedAt: "desc" }, { id: "desc" }],
    skip: 25,
    take: 25,
    select: {
      id: true,
      gymId: true,
      visitorName: true,
      visitorContact: true,
      visitCount: true,
      amount: true,
      visitedAt: true,
      notes: true,
    },
  })
})
