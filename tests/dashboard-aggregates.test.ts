import assert from "node:assert/strict"
import test from "node:test"

import {
  getConversionLeads,
  getExpiringMembershipsCount,
  getInactiveMembersCount,
  getMemberCountsByStatus,
  getMembershipMrr,
  getNewSignUpsThisMonth,
  getOverduePaymentsCount,
} from "../lib/dashboard/aggregates.ts"

test("groups member counts by status for one gym", async () => {
  const db = mockDb({
    member: {
      groupBy: async (args: unknown) => {
        calls.push(args)

        return [
          { status: "ACTIVE", _count: { _all: 8 } },
          { status: "INACTIVE", _count: { _all: 2 } },
        ]
      },
    },
  })
  const calls: unknown[] = []

  assert.deepEqual(await getMemberCountsByStatus("gym-1", db), {
    totalMembers: 10,
    activeMembers: 8,
    inactiveMembers: 2,
    suspendedMembers: 0,
  })
  assert.deepEqual(calls[0], {
    by: ["status"],
    where: { gymId: "gym-1" },
    _count: { _all: true },
  })
})

test("counts new sign-ups in a UTC month window", async () => {
  const calls: unknown[] = []
  const db = mockDb({
    member: {
      count: async (args: unknown) => {
        calls.push(args)

        return 4
      },
    },
  })
  const monthStart = new Date("2026-04-01T00:00:00.000Z")
  const nextMonthStart = new Date("2026-05-01T00:00:00.000Z")

  assert.equal(
    await getNewSignUpsThisMonth("gym-1", monthStart, nextMonthStart, db),
    4
  )
  assert.deepEqual(calls[0], {
    where: {
      gymId: "gym-1",
      joinDate: { gte: monthStart, lt: nextMonthStart },
    },
  })
})

test("calculates MRR with monthly and annual membership aggregate queries", async () => {
  const calls: unknown[] = []
  const db = mockDb({
    membership: {
      aggregate: async (args: unknown) => {
        calls.push(args)

        return calls.length === 1
          ? { _sum: { priceAmount: 350000 } }
          : { _sum: { priceAmount: 1200000 } }
      },
    },
  })

  assert.equal(await getMembershipMrr("gym-1", db), 450000)
  assert.deepEqual(calls, [
    {
      where: {
        member: { gymId: "gym-1" },
        status: "ACTIVE",
        billingInterval: "MONTHLY",
      },
      _sum: { priceAmount: true },
    },
    {
      where: {
        member: { gymId: "gym-1" },
        status: "ACTIVE",
        billingInterval: "ANNUAL",
      },
      _sum: { priceAmount: true },
    },
  ])
})

test("counts expiring memberships with separate monthly and annual windows", async () => {
  const calls: unknown[] = []
  const db = mockDb({
    membership: {
      count: async (args: unknown) => {
        calls.push(args)

        return calls.length
      },
    },
  })
  const now = new Date("2026-04-16T02:00:00.000Z")
  const monthlyWindowEnd = new Date("2026-04-23T02:00:00.000Z")
  const annualWindowEnd = new Date("2026-05-16T02:00:00.000Z")

  assert.equal(
    await getExpiringMembershipsCount(
      "gym-1",
      now,
      monthlyWindowEnd,
      annualWindowEnd,
      db
    ),
    3
  )
  assert.deepEqual(calls, [
    {
      where: {
        member: { gymId: "gym-1" },
        status: "ACTIVE",
        billingInterval: "MONTHLY",
        currentPeriodEndsAt: { gte: now, lte: monthlyWindowEnd },
      },
    },
    {
      where: {
        member: { gymId: "gym-1" },
        status: "ACTIVE",
        billingInterval: "ANNUAL",
        currentPeriodEndsAt: { gte: now, lte: annualWindowEnd },
      },
    },
  ])
})

test("counts overdue payments and stale inactive members with scoped filters", async () => {
  const paymentCalls: unknown[] = []
  const memberCalls: unknown[] = []
  const db = mockDb({
    membershipPayment: {
      count: async (args: unknown) => {
        paymentCalls.push(args)

        return 2
      },
    },
    member: {
      count: async (args: unknown) => {
        memberCalls.push(args)

        return 3
      },
    },
  })
  const now = new Date("2026-04-16T02:00:00.000Z")
  const inactiveCutoff = new Date("2026-03-17T02:00:00.000Z")

  assert.equal(await getOverduePaymentsCount("gym-1", now, db), 2)
  assert.equal(await getInactiveMembersCount("gym-1", inactiveCutoff, db), 3)
  assert.deepEqual(paymentCalls[0], {
    where: {
      gymId: "gym-1",
      OR: [
        { status: "OVERDUE" },
        { status: "PENDING", dueAt: { lt: now } },
      ],
    },
  })
  assert.deepEqual(memberCalls[0], {
    where: {
      gymId: "gym-1",
      status: "INACTIVE",
      OR: [
        { lastAttendedAt: null },
        { lastAttendedAt: { lte: inactiveCutoff } },
      ],
    },
  })
})

test("loads conversion leads with case-insensitive raw SQL parameters", async () => {
  const rawCalls: { strings: readonly string[]; values: unknown[] }[] = []
  const db = mockDb({
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      rawCalls.push({ strings: Array.from(strings), values })

      return [
        {
          visitorName: "Fajar Nugroho",
          visitorContact: "FAJAR@example.com",
          visitCount: 5,
          revenueAmount: 375000,
        },
      ]
    },
  })
  const monthStart = new Date("2026-04-01T00:00:00.000Z")
  const nextMonthStart = new Date("2026-05-01T00:00:00.000Z")

  assert.deepEqual(
    await getConversionLeads("gym-1", monthStart, nextMonthStart, 5, 50, db),
    [
      {
        visitorName: "Fajar Nugroho",
        visitorContact: "FAJAR@example.com",
        visitCount: 5,
        revenueAmount: 375000,
      },
    ]
  )
  assert.equal(rawCalls[0]?.values[0], "gym-1")
  assert.equal(rawCalls[0]?.values[1], monthStart)
  assert.equal(rawCalls[0]?.values[2], nextMonthStart)
  assert.equal(rawCalls[0]?.values[3], 5)
  assert.equal(rawCalls[0]?.values[4], 50)
  assert.match(rawCalls[0]?.strings.join(" "), /GROUP BY LOWER/)
})

type MockDbOverrides = Partial<
  Record<
    "member" | "membership" | "membershipPayment" | "dropInVisit",
    Record<string, unknown>
  >
> & {
  $queryRaw?: unknown
}

function mockDb(overrides: MockDbOverrides) {
  return {
    member: {
      groupBy: async () => [],
      count: async () => 0,
      findMany: async () => [],
      ...overrides.member,
    },
    membership: {
      aggregate: async () => ({ _sum: { priceAmount: null } }),
      count: async () => 0,
      findMany: async () => [],
      ...overrides.membership,
    },
    membershipPayment: {
      count: async () => 0,
      findMany: async () => [],
      ...overrides.membershipPayment,
    },
    dropInVisit: {
      aggregate: async () => ({ _sum: { amount: null, visitCount: null } }),
      ...overrides.dropInVisit,
    },
    $queryRaw: async () => [],
    ...overrides,
  } as never
}
