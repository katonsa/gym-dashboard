import { expect, test } from "vitest"

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
  expect(getOwnerGymQuery("owner-1")).toStrictEqual({
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

  expect(getPlanTiersQuery(gymId).where.gymId).toBe(gymId)
  expect(getDropInVisitsPageQuery(gymId, 25, 25).where.gymId).toBe(gymId)
})

test("builds a stable paginated drop-in query", () => {
  expect(getDropInVisitsPageQuery("gym-1", 25, 25)).toStrictEqual({
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
  expect(getMemberPaymentsPageQuery("gym-1", "member-1", 25, 25)).toStrictEqual(
    {
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
    }
  )

  expect(
    getMemberAttendancePageQuery("gym-1", "member-1", 20, 20)
  ).toStrictEqual({
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

  expect(where.gymId).toBe("gym-1")
  expect(getMemberRosterPageQuery(where, 50, 25, asOf).orderBy).toStrictEqual([
    { lastName: "asc" },
    { firstName: "asc" },
    { id: "asc" },
  ])
  expect(getMemberRosterPageQuery(where, 50, 25, asOf).skip).toBe(50)
  expect(getMemberRosterPageQuery(where, 50, 25, asOf).take).toBe(25)
  expect(
    getMemberRosterPageQuery(where, 50, 25, asOf).select.memberships.where
  ).toStrictEqual({
    status: {
      in: ["ACTIVE", "PAST_DUE", "EXPIRED"],
    },
  })
  expect(
    getMemberRosterPageQuery(where, 50, 25, asOf).select._count.select.payments
      .where
  ).toStrictEqual({
    OR: [{ status: "OVERDUE" }, { status: "PENDING", dueAt: { lt: asOf } }],
  })
  expect(where.AND).toBeTruthy()
})

test("builds member roster overdue risk from exact request time", () => {
  const paymentAsOf = new Date("2026-04-20T09:30:00.000Z")
  const membershipAsOf = new Date("2026-04-19T17:00:00.000Z")
  const where = getMemberRosterPageWhere(
    "gym-1",
    {
      q: "",
      status: "all",
      plan: "all",
      risk: "overdue",
    },
    paymentAsOf,
    membershipAsOf
  )

  expect(where).toStrictEqual({
    gymId: "gym-1",
    AND: [
      {
        payments: {
          some: {
            OR: [
              { status: "OVERDUE" },
              { status: "PENDING", dueAt: { lt: paymentAsOf } },
            ],
          },
        },
      },
    ],
  })
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

  expect(where).toStrictEqual({
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

test("builds a combined member attention risk filter", () => {
  const asOf = new Date("2026-04-16T00:00:00.000Z")
  const where = getMemberRosterPageWhere(
    "gym-1",
    {
      q: "",
      status: "all",
      plan: "all",
      risk: "attention",
    },
    asOf
  )

  expect(where.gymId).toBe("gym-1")
  expect(where.AND).toStrictEqual([
    {
      OR: [
        {
          payments: {
            some: {
              OR: [
                { status: "OVERDUE" },
                { status: "PENDING", dueAt: { lt: asOf } },
              ],
            },
          },
        },
        {
          AND: [
            { status: { not: "SUSPENDED" } },
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
                  status: "ACTIVE",
                  currentPeriodEndsAt: { gte: asOf },
                  OR: [
                    {
                      billingInterval: "MONTHLY",
                      currentPeriodEndsAt: { lte: addDays(asOf, 7) },
                    },
                    {
                      billingInterval: "ANNUAL",
                      currentPeriodEndsAt: { lte: addDays(asOf, 30) },
                    },
                  ],
                },
              },
            },
          ],
        },
        {
          AND: [
            { status: { not: "SUSPENDED" } },
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
    },
  ])
})

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}
