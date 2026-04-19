import assert from "node:assert/strict"
import test from "node:test"

import {
  getConversionLeads,
  getDropInTotal,
  getExpiringMembershipsCount,
  getInactiveMembersCount,
  getMemberCountsByStatus,
  getMembershipMrr,
  getNewSignUpsThisMonth,
  getOverdueAgingSummary,
  getOverduePaymentsCount,
  getPlanBreakdownAggregates,
  getRevenueTrend,
  getSubscriptionSummary,
} from "../lib/dashboard/aggregates.ts"
import type { PlanTier } from "../lib/dashboard/types.ts"

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
  const revenueAsOf = new Date("2026-04-18T17:00:00.000Z")
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

  assert.equal(await getMembershipMrr("gym-1", revenueAsOf, db), 450000)
  assert.deepEqual(calls, [
    {
      where: {
        member: { gymId: "gym-1" },
        status: "ACTIVE",
        billingInterval: "MONTHLY",
        currentPeriodEndsAt: { gte: revenueAsOf },
      },
      _sum: { priceAmount: true },
    },
    {
      where: {
        member: { gymId: "gym-1" },
        status: "ACTIVE",
        billingInterval: "ANNUAL",
        currentPeriodEndsAt: { gte: revenueAsOf },
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
      OR: [{ status: "OVERDUE" }, { status: "PENDING", dueAt: { lt: now } }],
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

test("aggregates drop-in totals for a scoped date window", async () => {
  const calls: unknown[] = []
  const db = mockDb({
    dropInVisit: {
      aggregate: async (args: unknown) => {
        calls.push(args)

        return { _sum: { amount: 225000, visitCount: 3 } }
      },
    },
  })
  const dayStart = new Date("2026-04-16T00:00:00.000Z")
  const nextDayStart = new Date("2026-04-17T00:00:00.000Z")

  assert.deepEqual(await getDropInTotal("gym-1", dayStart, nextDayStart, db), {
    revenueAmount: 225000,
    visitCount: 3,
  })
  assert.deepEqual(calls[0], {
    where: {
      gymId: "gym-1",
      visitedAt: { gte: dayStart, lt: nextDayStart },
    },
    _sum: { amount: true, visitCount: true },
  })
})

test("maps plan breakdown aggregate rows onto sorted plan tiers", async () => {
  const rawCalls: { strings: readonly string[]; values: unknown[] }[] = []
  const revenueAsOf = new Date("2026-04-18T17:00:00.000Z")
  const db = mockDb({
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      rawCalls.push({ strings: Array.from(strings), values })

      return [
        {
          planTierId: "plan-pro",
          memberCount: 3,
          monthlyMemberships: 2,
          annualMemberships: 1,
          monthlyEquivalentRevenue: 800000,
        },
      ]
    },
  })
  const plans: PlanTier[] = [
    planTier({ id: "plan-pro", name: "Pro", sortOrder: 2 }),
    planTier({ id: "plan-basic", name: "Basic", sortOrder: 1 }),
  ]

  assert.deepEqual(
    await getPlanBreakdownAggregates("gym-1", plans, revenueAsOf, db),
    [
      {
        id: "plan-basic",
        name: "Basic",
        description: undefined,
        memberCount: 0,
        memberShare: 0,
        monthlyMemberships: 0,
        annualMemberships: 0,
        monthlyEquivalentRevenue: 0,
      },
      {
        id: "plan-pro",
        name: "Pro",
        description: undefined,
        memberCount: 3,
        memberShare: 1,
        monthlyMemberships: 2,
        annualMemberships: 1,
        monthlyEquivalentRevenue: 800000,
      },
    ]
  )
  assert.equal(rawCalls[0]?.values[0], "gym-1")
  assert.equal(rawCalls[0]?.values[1], revenueAsOf)
  assert.match(rawCalls[0]?.strings.join(" "), /"status" = 'ACTIVE'/)
  assert.match(rawCalls[0]?.strings.join(" "), /"currentPeriodEndsAt" >=/)
})

test("loads subscription setup from current active revenue memberships only", async () => {
  const membershipCountCalls: unknown[] = []
  const revenueAsOf = new Date("2026-04-18T17:00:00.000Z")
  const db = mockDb({
    membership: {
      count: async (args: unknown) => {
        membershipCountCalls.push(args)

        return membershipCountCalls.length === 1 ? 1 : 2
      },
    },
    membershipPayment: {
      count: async () => 0,
    },
    dropInVisit: {
      aggregate: async () => ({ _sum: { visitCount: 0 } }),
    },
  })
  const plans: PlanTier[] = [
    planTier({ id: "plan-basic", name: "Basic", sortOrder: 1 }),
  ]

  const summary = await getSubscriptionSummary(
    "gym-1",
    plans,
    new Date("2026-04-19T09:30:00.000Z"),
    revenueAsOf,
    db
  )

  assert.equal(summary.setupState.hasActiveRevenueMemberships, true)
  assert.deepEqual(membershipCountCalls[0], {
    where: {
      member: { gymId: "gym-1" },
      status: "ACTIVE",
      currentPeriodEndsAt: { gte: revenueAsOf },
    },
  })
})

test("combines membership and drop-in raw rows into revenue trend", async () => {
  const rawCalls: { strings: readonly string[]; values: unknown[] }[] = []
  const db = mockDb({
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      rawCalls.push({ strings: Array.from(strings), values })

      if (rawCalls.length === 1) {
        return [
          {
            month: "2026-03-01T00:00:00.000Z",
            membershipRevenue: 350000,
          },
          {
            month: "2026-04-01T00:00:00.000Z",
            membershipRevenue: 450000,
          },
        ]
      }

      return [
        {
          month: "2026-04-01T00:00:00.000Z",
          dropInRevenue: 225000,
        },
      ]
    },
  })
  const startMonth = new Date("2026-03-01T00:00:00.000Z")
  const endMonth = new Date("2026-04-01T00:00:00.000Z")
  const nextMonthAfterTrend = new Date("2026-05-01T00:00:00.000Z")

  assert.deepEqual(
    await getRevenueTrend(
      "gym-1",
      startMonth,
      endMonth,
      nextMonthAfterTrend,
      db
    ),
    [
      { month: "Mar", membership: 350000, dropIns: 0, total: 350000 },
      { month: "Apr", membership: 450000, dropIns: 225000, total: 675000 },
    ]
  )
  assert.deepEqual(rawCalls[0]?.values, [startMonth, endMonth, "gym-1"])
  assert.deepEqual(rawCalls[1]?.values, [
    "gym-1",
    startMonth,
    nextMonthAfterTrend,
  ])
})

test("maps overdue payments into aging summary buckets", async () => {
  const rawCalls: { strings: readonly string[]; values: unknown[] }[] = []
  const db = mockDb({
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      rawCalls.push({ strings: Array.from(strings), values })

      return [
        {
          bucket: "1-7 days",
          count: BigInt(1),
          totalAmount: BigInt(450000),
        },
        { bucket: "8-14 days", count: 2, totalAmount: 700000 },
      ]
    },
  })
  const now = new Date("2026-04-16T02:00:00.000Z")

  assert.deepEqual(await getOverdueAgingSummary("gym-1", now, db), [
    { bucket: "1-7 days", count: 1, totalAmount: 450000 },
    { bucket: "8-14 days", count: 2, totalAmount: 700000 },
  ])
  assert.deepEqual(rawCalls[0]?.values, [now, "gym-1", now])
  assert.match(rawCalls[0]?.strings.join(" "), /status" = 'OVERDUE'/)
  assert.match(rawCalls[0]?.strings.join(" "), /status" = 'PENDING'/)
})

type MockDbOverrides = Partial<
  Record<
    "member" | "membership" | "membershipPayment" | "dropInVisit" | "planTier",
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
    planTier: {
      findMany: async () => [],
      ...overrides.planTier,
    },
    $queryRaw: async () => [],
    ...overrides,
  } as never
}

function planTier(overrides: Partial<PlanTier> = {}): PlanTier {
  return {
    id: "plan-basic",
    gymId: "gym-1",
    name: "Basic",
    monthlyPriceAmount: 350000,
    annualPriceAmount: 3600000,
    isActive: true,
    sortOrder: 1,
    ...overrides,
  }
}
