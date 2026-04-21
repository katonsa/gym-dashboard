import { expect, test } from "vitest"

import {
  getConversionLeads,
  getDropInSummary,
  getDropInTotal,
  getExpiredMembershipsCount,
  getExpiringMembershipsCount,
  getInactiveMembersCount,
  getMemberCountsByStatus,
  getMembershipMrr,
  getNewSignUpsThisMonth,
  getOverdueAgingSummary,
  getOverduePaymentsCount,
  getOverviewAlerts,
  getOverviewSetupState,
  getOverviewSummary,
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

  expect(await getMemberCountsByStatus("gym-1", db)).toStrictEqual({
    totalMembers: 10,
    activeMembers: 8,
    inactiveMembers: 2,
    suspendedMembers: 0,
  })
  expect(calls[0]).toStrictEqual({
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

  expect(
    await getNewSignUpsThisMonth("gym-1", monthStart, nextMonthStart, db)
  ).toBe(4)
  expect(calls[0]).toStrictEqual({
    where: {
      gymId: "gym-1",
      joinDate: { gte: monthStart, lt: nextMonthStart },
    },
  })
})

test("uses a gym-local month window for overview month metrics", async () => {
  const memberCountCalls: unknown[] = []
  const dropInAggregateCalls: unknown[] = []
  const rawCalls: { strings: readonly string[]; values: unknown[] }[] = []
  const db = mockDb({
    member: {
      groupBy: async () => [],
      count: async (args: unknown) => {
        memberCountCalls.push(args)

        return 0
      },
    },
    dropInVisit: {
      aggregate: async (args: unknown) => {
        dropInAggregateCalls.push(args)

        return { _sum: { amount: 0, visitCount: 0 } }
      },
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      rawCalls.push({ strings: Array.from(strings), values })

      return [{ count: 0 }]
    },
  })

  await getOverviewSummary(
    "gym-1",
    "IDR",
    {
      asOf: new Date("2026-04-30T18:30:00.000Z"),
      timeZone: "Asia/Jakarta",
    },
    db
  )

  const monthStart = new Date("2026-04-30T17:00:00.000Z")
  const nextMonthStart = new Date("2026-05-31T17:00:00.000Z")

  expect(memberCountCalls[0]).toStrictEqual({
    where: {
      gymId: "gym-1",
      joinDate: { gte: monthStart, lt: nextMonthStart },
    },
  })
  expect(dropInAggregateCalls[0]).toStrictEqual({
    where: {
      gymId: "gym-1",
      visitedAt: { gte: monthStart, lt: nextMonthStart },
    },
    _sum: { amount: true },
  })
  expect(rawCalls[0]?.values[1]).toStrictEqual(monthStart)
  expect(rawCalls[0]?.values[2]).toStrictEqual(nextMonthStart)
})

test("derives overview setup state from scoped gym records", async () => {
  const planTierCalls: unknown[] = []
  const memberCalls: unknown[] = []
  const membershipCalls: unknown[] = []
  const dropInCalls: unknown[] = []
  const db = mockDb({
    planTier: {
      count: async (args: unknown) => {
        planTierCalls.push(args)

        return 1
      },
    },
    member: {
      count: async (args: unknown) => {
        memberCalls.push(args)

        return 2
      },
    },
    membership: {
      count: async (args: unknown) => {
        membershipCalls.push(args)

        return 0
      },
    },
    dropInVisit: {
      aggregate: async (args: unknown) => {
        dropInCalls.push(args)

        return { _sum: { amount: null, visitCount: 3 } }
      },
    },
  })

  expect(await getOverviewSetupState("gym-1", db)).toStrictEqual({
    hasPlanTiers: true,
    hasMembers: true,
    hasMemberships: false,
    hasDropIns: true,
  })
  expect(planTierCalls[0]).toStrictEqual({ where: { gymId: "gym-1" } })
  expect(memberCalls[0]).toStrictEqual({ where: { gymId: "gym-1" } })
  expect(membershipCalls[0]).toStrictEqual({
    where: { member: { gymId: "gym-1" } },
  })
  expect(dropInCalls[0]).toStrictEqual({
    where: { gymId: "gym-1" },
    _sum: { visitCount: true },
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

  expect(await getMembershipMrr("gym-1", revenueAsOf, db)).toBe(450000)
  expect(calls).toStrictEqual([
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

  expect(
    await getExpiringMembershipsCount(
      "gym-1",
      now,
      monthlyWindowEnd,
      annualWindowEnd,
      db
    )
  ).toBe(3)
  expect(calls).toStrictEqual([
    {
      where: {
        member: {
          gymId: "gym-1",
          status: {
            not: "SUSPENDED",
          },
        },
        status: "ACTIVE",
        billingInterval: "MONTHLY",
        currentPeriodEndsAt: { gte: now, lte: monthlyWindowEnd },
      },
    },
    {
      where: {
        member: {
          gymId: "gym-1",
          status: {
            not: "SUSPENDED",
          },
        },
        status: "ACTIVE",
        billingInterval: "ANNUAL",
        currentPeriodEndsAt: { gte: now, lte: annualWindowEnd },
      },
    },
  ])
})

test("counts expired memberships with persisted and de facto expired rows", async () => {
  const calls: unknown[] = []
  const db = mockDb({
    membership: {
      count: async (args: unknown) => {
        calls.push(args)

        return 2
      },
    },
  })
  const asOf = new Date("2026-04-18T17:00:00.000Z")

  expect(await getExpiredMembershipsCount("gym-1", asOf, db)).toBe(2)
  expect(calls[0]).toStrictEqual({
    where: {
      member: {
        gymId: "gym-1",
        status: {
          not: "SUSPENDED",
        },
      },
      OR: [
        { status: "EXPIRED" },
        {
          status: "ACTIVE",
          currentPeriodEndsAt: { lt: asOf },
        },
      ],
    },
  })
})

test("maps expired memberships into distinct overview alerts", async () => {
  const membershipFindManyCalls: unknown[] = []
  const db = mockDb({
    membership: {
      findMany: async (args: unknown) => {
        membershipFindManyCalls.push(args)

        return membershipFindManyCalls.length === 1
          ? [
              {
                id: "membership-expired",
                memberId: "member-1",
                status: "ACTIVE",
                currentPeriodEndsAt: "2026-04-10T00:00:00.000Z",
                member: {
                  firstName: "Ari",
                  lastName: "Expired",
                },
              },
            ]
          : []
      },
    },
  })
  const alerts = await getOverviewAlerts(
    "gym-1",
    "IDR",
    {
      asOf: new Date("2026-04-19T09:30:00.000Z"),
      membershipAsOf: new Date("2026-04-18T17:00:00.000Z"),
      alertLimit: 50,
    },
    db
  )

  expect(alerts[0]?.type).toBe("EXPIRED_MEMBERSHIP")
  expect(alerts[0]?.severity).toBe("critical")
  expect(alerts[0]?.membershipId).toBe("membership-expired")
  expect(alerts[0]?.membershipStatus).toBe("ACTIVE")
  expect(membershipFindManyCalls[0]).toStrictEqual({
    where: {
      member: {
        gymId: "gym-1",
        status: {
          not: "SUSPENDED",
        },
      },
      OR: [
        { status: "EXPIRED" },
        {
          status: "ACTIVE",
          currentPeriodEndsAt: {
            lt: new Date("2026-04-18T17:00:00.000Z"),
          },
        },
      ],
    },
    orderBy: [{ currentPeriodEndsAt: "asc" }, { id: "asc" }],
    take: 50,
    select: {
      id: true,
      memberId: true,
      status: true,
      currentPeriodEndsAt: true,
      member: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })
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

  expect(await getOverduePaymentsCount("gym-1", now, db)).toBe(2)
  expect(await getInactiveMembersCount("gym-1", inactiveCutoff, db)).toBe(3)
  expect(paymentCalls[0]).toStrictEqual({
    where: {
      gymId: "gym-1",
      OR: [{ status: "OVERDUE" }, { status: "PENDING", dueAt: { lt: now } }],
    },
  })
  expect(memberCalls[0]).toStrictEqual({
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

  expect(
    await getConversionLeads("gym-1", monthStart, nextMonthStart, 5, 50, db)
  ).toStrictEqual([
    {
      visitorName: "Fajar Nugroho",
      visitorContact: "FAJAR@example.com",
      visitCount: 5,
      revenueAmount: 375000,
    },
  ])
  expect(rawCalls[0]?.values[0]).toBe("gym-1")
  expect(rawCalls[0]?.values[1]).toBe(monthStart)
  expect(rawCalls[0]?.values[2]).toBe(nextMonthStart)
  expect(rawCalls[0]?.values[3]).toBe(5)
  expect(rawCalls[0]?.values[4]).toBe(50)
  expect(rawCalls[0]?.strings.join(" ")).toMatch(/GROUP BY LOWER/)
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

  expect(
    await getDropInTotal("gym-1", dayStart, nextDayStart, db)
  ).toStrictEqual({
    revenueAmount: 225000,
    visitCount: 3,
  })
  expect(calls[0]).toStrictEqual({
    where: {
      gymId: "gym-1",
      visitedAt: { gte: dayStart, lt: nextDayStart },
    },
    _sum: { amount: true, visitCount: true },
  })
})

test("uses gym-local day and month windows for drop-in summary", async () => {
  const aggregateCalls: unknown[] = []
  const rawCalls: { strings: readonly string[]; values: unknown[] }[] = []
  const db = mockDb({
    dropInVisit: {
      aggregate: async (args: unknown) => {
        aggregateCalls.push(args)

        return { _sum: { amount: 0, visitCount: 0 } }
      },
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      rawCalls.push({ strings: Array.from(strings), values })

      return []
    },
  })

  await getDropInSummary(
    "gym-1",
    {
      asOf: new Date("2026-04-30T18:30:00.000Z"),
      timeZone: "Asia/Jakarta",
    },
    db
  )

  expect(aggregateCalls[0]).toStrictEqual({
    where: {
      gymId: "gym-1",
      visitedAt: {
        gte: new Date("2026-04-30T17:00:00.000Z"),
        lt: new Date("2026-05-01T17:00:00.000Z"),
      },
    },
    _sum: { amount: true, visitCount: true },
  })
  expect(aggregateCalls[1]).toStrictEqual({
    where: {
      gymId: "gym-1",
      visitedAt: {
        gte: new Date("2026-04-30T17:00:00.000Z"),
        lt: new Date("2026-05-31T17:00:00.000Z"),
      },
    },
    _sum: { amount: true, visitCount: true },
  })
  assertDateIso(rawCalls[0]?.values[1], "2026-04-30T17:00:00.000Z")
  assertDateIso(rawCalls[0]?.values[2], "2026-05-31T17:00:00.000Z")
})

function assertDateIso(value: unknown, isoDate: string) {
  expect(value instanceof Date).toBe(true)

  if (value instanceof Date) {
    expect(value.toISOString()).toBe(isoDate)
  }
}

test("maps plan breakdown aggregate rows onto sorted plan tiers", async () => {
  const rawCalls: { strings: readonly string[]; values: unknown[] }[] = []
  const revenueAsOf = new Date("2026-04-18T17:00:00.000Z")
  const db = mockDb({
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      rawCalls.push({ strings: Array.from(strings), values })

      if (strings.join(" ").includes("SELECT DISTINCT")) {
        return [
          { planTierId: "plan-pro" },
          { planTierId: "plan-inactive-current" },
          { planTierId: "plan-legacy" },
        ]
      }

      return [
        {
          planTierId: "plan-pro",
          memberCount: 3,
          monthlyMemberships: 2,
          annualMemberships: 1,
          monthlyEquivalentRevenue: 800000,
        },
        {
          planTierId: "plan-inactive-current",
          memberCount: 1,
          monthlyMemberships: 1,
          annualMemberships: 0,
          monthlyEquivalentRevenue: 200000,
        },
      ]
    },
  })
  const plans: PlanTier[] = [
    planTier({ id: "plan-pro", name: "Pro", sortOrder: 2 }),
    planTier({ id: "plan-basic", name: "Basic", sortOrder: 1 }),
    planTier({
      id: "plan-inactive-current",
      name: "Inactive Current",
      isActive: false,
      sortOrder: 3,
    }),
    planTier({
      id: "plan-legacy",
      name: "Legacy",
      isActive: false,
      sortOrder: 4,
    }),
    planTier({
      id: "plan-unused",
      name: "Unused",
      isActive: false,
      sortOrder: 5,
    }),
  ]

  expect(
    await getPlanBreakdownAggregates("gym-1", plans, revenueAsOf, db)
  ).toStrictEqual([
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
      memberShare: 0.75,
      monthlyMemberships: 2,
      annualMemberships: 1,
      monthlyEquivalentRevenue: 800000,
    },
    {
      id: "plan-inactive-current",
      name: "Inactive Current",
      description: undefined,
      memberCount: 1,
      memberShare: 0.25,
      monthlyMemberships: 1,
      annualMemberships: 0,
      monthlyEquivalentRevenue: 200000,
    },
    {
      id: "plan-legacy",
      name: "Legacy",
      description: undefined,
      memberCount: 0,
      memberShare: 0,
      monthlyMemberships: 0,
      annualMemberships: 0,
      monthlyEquivalentRevenue: 0,
    },
  ])
  expect(rawCalls[0]?.values[0]).toBe("gym-1")
  expect(rawCalls[0]?.values[1]).toBe(revenueAsOf)
  expect(rawCalls[0]?.strings.join(" ")).toMatch(/"status" = 'ACTIVE'/)
  expect(rawCalls[0]?.strings.join(" ")).toMatch(/"currentPeriodEndsAt" >=/)
  expect(rawCalls[1]?.values[0]).toBe("gym-1")
  expect(rawCalls[1]?.strings.join(" ")).toMatch(/SELECT DISTINCT/)
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

  expect(summary.setupState.hasActiveRevenueMemberships).toBe(true)
  expect(membershipCountCalls[0]).toStrictEqual({
    where: {
      member: { gymId: "gym-1" },
      status: "ACTIVE",
      currentPeriodEndsAt: { gte: revenueAsOf },
    },
  })
})

test("uses gym-local month windows for subscription revenue trend", async () => {
  const rawCalls: { strings: readonly string[]; values: unknown[] }[] = []
  const revenueAsOf = new Date("2026-04-30T17:00:00.000Z")
  const db = mockDb({
    membership: {
      count: async () => 1,
    },
    membershipPayment: {
      count: async () => 0,
    },
    dropInVisit: {
      aggregate: async () => ({ _sum: { visitCount: 1 } }),
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      rawCalls.push({ strings: Array.from(strings), values })

      const sql = strings.join(" ")

      if (sql.includes('"planTierId"')) {
        return []
      }

      if (sql.includes('"membershipRevenue"')) {
        return [{ membershipRevenue: 100000 }]
      }

      return [{ dropInRevenue: 25000 }]
    },
  })
  const plans: PlanTier[] = [
    planTier({ id: "plan-basic", name: "Basic", sortOrder: 1 }),
  ]

  const summary = await getSubscriptionSummary(
    "gym-1",
    plans,
    new Date("2026-04-30T18:30:00.000Z"),
    revenueAsOf,
    db,
    "Asia/Jakarta"
  )

  expect(summary.revenueTrend.at(-1)).toStrictEqual({
    month: "May",
    membership: 100000,
    dropIns: 25000,
    total: 125000,
  })
  expect(hasRawCallDate(rawCalls, "2026-04-30T17:00:00.000Z")).toBe(true)
  expect(hasRawCallDate(rawCalls, "2026-05-31T17:00:00.000Z")).toBe(true)
})

function hasRawCallDate(
  rawCalls: { strings: readonly string[]; values: unknown[] }[],
  isoDate: string
) {
  return rawCalls.some((call) =>
    call.values.some(
      (value) => value instanceof Date && value.toISOString() === isoDate
    )
  )
}

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

  expect(
    await getRevenueTrend(
      "gym-1",
      startMonth,
      endMonth,
      nextMonthAfterTrend,
      db
    )
  ).toStrictEqual([
    { month: "Mar", membership: 350000, dropIns: 0, total: 350000 },
    { month: "Apr", membership: 450000, dropIns: 225000, total: 675000 },
  ])
  expect(rawCalls[0]?.values).toStrictEqual([startMonth, endMonth, "gym-1"])
  expect(rawCalls[1]?.values).toStrictEqual([
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

  expect(await getOverdueAgingSummary("gym-1", now, db)).toStrictEqual([
    { bucket: "1-7 days", count: 1, totalAmount: 450000 },
    { bucket: "8-14 days", count: 2, totalAmount: 700000 },
  ])
  expect(rawCalls[0]?.values).toStrictEqual([now, "gym-1", now])
  expect(rawCalls[0]?.strings.join(" ")).toMatch(/status" = 'OVERDUE'/)
  expect(rawCalls[0]?.strings.join(" ")).toMatch(/status" = 'PENDING'/)
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
      count: async () => 0,
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
