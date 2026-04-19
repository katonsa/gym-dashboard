import assert from "node:assert/strict"
import test from "node:test"

import {
  getDropInVisitsPageQuery,
  getMemberAttendancePageQuery,
  getMemberPaymentsPageQuery,
  getMemberRosterPageQuery,
  getMemberRosterPageWhere,
  getOwnerGymQuery,
  getPlanTiersQuery,
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
  assert.equal(getDropInVisitsPageQuery(gymId, 25, 25).where.gymId, gymId)
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

test("builds stable paginated member detail queries", () => {
  assert.deepEqual(getMemberPaymentsPageQuery("gym-1", "member-1", 25, 25), {
    where: { gymId: "gym-1", memberId: "member-1" },
    orderBy: [{ dueAt: "desc" }, { id: "desc" }],
    skip: 25,
    take: 25,
    select: {
      id: true,
      gymId: true,
      memberId: true,
      membershipId: true,
      amount: true,
      status: true,
      dueAt: true,
      paidAt: true,
      notes: true,
    },
  })

  assert.deepEqual(getMemberAttendancePageQuery("gym-1", "member-1", 20, 20), {
    where: { gymId: "gym-1", memberId: "member-1" },
    orderBy: [{ attendedAt: "desc" }, { id: "desc" }],
    skip: 20,
    take: 20,
    select: {
      id: true,
      gymId: true,
      memberId: true,
      attendedAt: true,
      source: true,
      notes: true,
    },
  })
})

test("builds member roster filters and paginated query", () => {
  const asOf = new Date("2026-04-16T00:00:00.000Z")
  const where = getMemberRosterPageWhere(
    "gym-1",
    {
      q: "ari",
      status: "ACTIVE",
      plan: "Pro",
      risk: "clear",
    },
    asOf
  )

  assert.equal(where.gymId, "gym-1")
  assert.deepEqual(getMemberRosterPageQuery(where, 50, 25, asOf).orderBy, [
    { lastName: "asc" },
    { firstName: "asc" },
    { id: "asc" },
  ])
  assert.equal(getMemberRosterPageQuery(where, 50, 25, asOf).skip, 50)
  assert.equal(getMemberRosterPageQuery(where, 50, 25, asOf).take, 25)
  assert.deepEqual(
    getMemberRosterPageQuery(where, 50, 25, asOf).select.memberships.where,
    {
      status: {
        in: ["ACTIVE", "PAST_DUE", "EXPIRED"],
      },
    }
  )
  assert.ok(where.AND)
})

test("builds an expired member roster risk filter", () => {
  const asOf = new Date("2026-04-16T00:00:00.000Z")
  const where = getMemberRosterPageWhere(
    "gym-1",
    {
      q: "",
      status: "all",
      plan: "all",
      risk: "expired",
    },
    asOf
  )

  assert.deepEqual(where, {
    gymId: "gym-1",
    AND: [
      {
        AND: [
          {
            status: {
              not: "SUSPENDED",
            },
          },
          {
            NOT: {
              payments: {
                some: {
                  OR: [
                    { status: "OVERDUE" },
                    { status: "PENDING", dueAt: { lt: asOf } },
                  ],
                },
              },
            },
          },
          {
            memberships: {
              some: {
                OR: [
                  { status: "EXPIRED" },
                  {
                    status: "ACTIVE",
                    currentPeriodEndsAt: { lt: asOf },
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  })
})
