import assert from "node:assert/strict"
import test from "node:test"

import {
  calculateDropInRevenueForMonth,
  calculateMembershipMrr,
  getDropInConversionOpportunities,
  getExpiringMemberships,
  getInactiveMembers,
  getOverduePayments,
} from "../lib/dashboard/calculations.ts"
import {
  buildMemberRosterPageRows,
  buildMemberRosterRows,
  parseMemberRosterFilters,
} from "../lib/dashboard/member-roster.ts"
import type {
  DashboardData,
  DropInVisit,
  GymProfile,
  Member,
  Membership,
  MembershipPayment,
  PlanTier,
} from "../lib/dashboard/types.ts"

const asOf = new Date("2026-04-16T09:00:00.000+07:00")

test("normalizes active memberships into MRR and ignores paused memberships", () => {
  const memberships: Membership[] = [
    membership({
      id: "monthly-active",
      status: "ACTIVE",
      billingInterval: "MONTHLY",
      priceAmount: 350000,
    }),
    membership({
      id: "annual-active",
      status: "ACTIVE",
      billingInterval: "ANNUAL",
      priceAmount: 1200000,
    }),
    membership({
      id: "monthly-past-due",
      status: "PAST_DUE",
      billingInterval: "MONTHLY",
      priceAmount: 250000,
    }),
    membership({
      id: "expired",
      status: "EXPIRED",
      billingInterval: "MONTHLY",
      priceAmount: 999999,
    }),
  ]

  assert.equal(calculateMembershipMrr(memberships), 450000)
})

test("calculates drop-in revenue for the current month only", () => {
  const dropIns: DropInVisit[] = [
    dropIn({
      id: "apr-1",
      amount: 150000,
      visitedAt: "2026-04-01T10:00:00.000+07:00",
    }),
    dropIn({
      id: "apr-2",
      amount: 75000,
      visitedAt: "2026-04-15T18:00:00.000+07:00",
    }),
    dropIn({
      id: "mar-1",
      amount: 300000,
      visitedAt: "2026-03-31T18:00:00.000+07:00",
    }),
  ]

  assert.equal(calculateDropInRevenueForMonth(dropIns, asOf), 225000)
})

test("detects active memberships expiring inside the relevant windows", () => {
  const memberships: Membership[] = [
    membership({
      id: "monthly-inside-window",
      billingInterval: "MONTHLY",
      currentPeriodEndsAt: "2026-04-20T23:59:59.000+07:00",
    }),
    membership({
      id: "monthly-outside-window",
      billingInterval: "MONTHLY",
      currentPeriodEndsAt: "2026-04-30T23:59:59.000+07:00",
    }),
    membership({
      id: "annual-inside-window",
      billingInterval: "ANNUAL",
      currentPeriodEndsAt: "2026-05-12T23:59:59.000+07:00",
    }),
    membership({
      id: "past-due-ignored",
      status: "PAST_DUE",
      billingInterval: "MONTHLY",
      currentPeriodEndsAt: "2026-04-18T23:59:59.000+07:00",
    }),
  ]

  assert.deepEqual(
    getExpiringMemberships(memberships, { asOf }).map((item) => item.id),
    ["monthly-inside-window", "annual-inside-window"]
  )
})

test("detects explicit overdue payments and pending payments past due", () => {
  const payments: MembershipPayment[] = [
    payment({
      id: "explicit-overdue",
      status: "OVERDUE",
      dueAt: "2026-04-20T08:00:00.000+07:00",
    }),
    payment({
      id: "pending-past-due",
      status: "PENDING",
      dueAt: "2026-04-15T08:00:00.000+07:00",
    }),
    payment({
      id: "pending-future",
      status: "PENDING",
      dueAt: "2026-04-17T08:00:00.000+07:00",
    }),
    payment({
      id: "paid-past-due",
      status: "PAID",
      dueAt: "2026-04-15T08:00:00.000+07:00",
    }),
  ]

  assert.deepEqual(
    getOverduePayments(payments, asOf).map((item) => item.id),
    ["explicit-overdue", "pending-past-due"]
  )
})

test("builds member roster rows with overdue, expiring, and clear billing risk", () => {
  const data = dashboardData({
    members: [
      member({ id: "overdue-member", firstName: "Ari", lastName: "Overdue" }),
      member({
        id: "expiring-member",
        firstName: "Bima",
        lastName: "Expiring",
      }),
      member({ id: "clear-member", firstName: "Citra", lastName: "Clear" }),
    ],
    memberships: [
      membership({
        id: "overdue-membership",
        memberId: "overdue-member",
        currentPeriodEndsAt: "2026-04-20T23:59:59.000+07:00",
      }),
      membership({
        id: "expiring-membership",
        memberId: "expiring-member",
        currentPeriodEndsAt: "2026-04-20T23:59:59.000+07:00",
      }),
      membership({
        id: "clear-membership",
        memberId: "clear-member",
        currentPeriodEndsAt: "2026-05-20T23:59:59.000+07:00",
      }),
    ],
    payments: [
      payment({
        id: "overdue-payment",
        memberId: "overdue-member",
        membershipId: "overdue-membership",
        status: "OVERDUE",
      }),
    ],
  })

  assert.deepEqual(
    buildMemberRosterRows(data, asOf).map((row) => [row.id, row.billingRisk]),
    [
      ["overdue-member", "overdue"],
      ["expiring-member", "expiring"],
      ["clear-member", "clear"],
    ]
  )
})

test("builds paginated member roster rows from per-member query data", () => {
  assert.deepEqual(
    buildMemberRosterPageRows(
      [
        memberRosterPageMember({
          id: "overdue-member",
          _count: {
            attendanceRecords: 12,
            payments: 1,
          },
        }),
        memberRosterPageMember({
          id: "expiring-member",
          firstName: "Bima",
          lastName: "Expiring",
          memberships: [
            memberRosterMembership({
              currentPeriodEndsAt: "2026-04-20T23:59:59.000+07:00",
            }),
          ],
        }),
        memberRosterPageMember({
          id: "clear-member",
          firstName: "Citra",
          lastName: "Clear",
          memberships: [
            memberRosterMembership({
              currentPeriodEndsAt: "2026-05-20T23:59:59.000+07:00",
            }),
          ],
        }),
      ],
      asOf
    ).map((row) => [row.id, row.sessionsAttended, row.billingRisk]),
    [
      ["overdue-member", 12, "overdue"],
      ["expiring-member", 0, "expiring"],
      ["clear-member", 0, "clear"],
    ]
  )
})

test("parses member roster filters from URL search params", () => {
  assert.deepEqual(
    parseMemberRosterFilters({
      q: " Ari ",
      status: "ACTIVE",
      plan: "Pro",
      risk: "overdue",
    }),
    {
      q: "Ari",
      status: "ACTIVE",
      plan: "Pro",
      risk: "overdue",
    }
  )

  assert.deepEqual(
    parseMemberRosterFilters({
      status: "UNKNOWN",
      risk: "bad",
    }),
    {
      q: "",
      status: "all",
      plan: "all",
      risk: "all",
    }
  )
})

test("detects inactive members with stale or missing attendance", () => {
  const members: Member[] = [
    member({
      id: "inactive-stale",
      status: "INACTIVE",
      lastAttendedAt: "2026-03-01T09:00:00.000+07:00",
    }),
    member({
      id: "inactive-missing",
      status: "INACTIVE",
      lastAttendedAt: undefined,
    }),
    member({
      id: "inactive-recent",
      status: "INACTIVE",
      lastAttendedAt: "2026-04-01T09:00:00.000+07:00",
    }),
    member({
      id: "active-stale",
      status: "ACTIVE",
      lastAttendedAt: "2026-03-01T09:00:00.000+07:00",
    }),
  ]

  assert.deepEqual(
    getInactiveMembers(members, { asOf }).map((item) => item.id),
    ["inactive-stale", "inactive-missing"]
  )
})

test("detects named current-month drop-in conversion opportunities", () => {
  const dropIns: DropInVisit[] = [
    dropIn({
      id: "fajar-1",
      visitorName: "Fajar Nugroho",
      visitorContact: "+628122220001",
      visitCount: 2,
      amount: 150000,
      visitedAt: "2026-04-02T17:15:00.000+07:00",
    }),
    dropIn({
      id: "fajar-2",
      visitorName: "Fajar Nugroho",
      visitorContact: "+628122220001",
      visitCount: 3,
      amount: 225000,
      visitedAt: "2026-04-12T18:30:00.000+07:00",
    }),
    dropIn({
      id: "anonymous",
      visitorName: undefined,
      visitorContact: undefined,
      visitCount: 8,
      amount: 600000,
      visitedAt: "2026-04-13T18:30:00.000+07:00",
    }),
    dropIn({
      id: "march-fajar",
      visitorName: "Fajar Nugroho",
      visitorContact: "+628122220001",
      visitCount: 8,
      amount: 600000,
      visitedAt: "2026-03-13T18:30:00.000+07:00",
    }),
  ]

  assert.deepEqual(getDropInConversionOpportunities(dropIns, { asOf }), [
    {
      visitorName: "Fajar Nugroho",
      visitorContact: "+628122220001",
      visitCount: 5,
      revenueAmount: 375000,
    },
  ])
})

function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: "membership",
    memberId: "member",
    planTierId: "plan-basic",
    billingInterval: "MONTHLY",
    status: "ACTIVE",
    priceAmount: 350000,
    startedAt: "2026-04-01T09:00:00.000+07:00",
    currentPeriodEndsAt: "2026-05-01T23:59:59.000+07:00",
    nextBillingDate: "2026-05-02T08:00:00.000+07:00",
    ...overrides,
  }
}

function payment(
  overrides: Partial<MembershipPayment> = {}
): MembershipPayment {
  return {
    id: "payment",
    gymId: "gym",
    memberId: "member",
    membershipId: "membership",
    amount: 350000,
    status: "PENDING",
    dueAt: "2026-04-15T08:00:00.000+07:00",
    ...overrides,
  }
}

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: "member",
    gymId: "gym",
    firstName: "Member",
    lastName: "Example",
    status: "ACTIVE",
    joinDate: "2026-01-01T09:00:00.000+07:00",
    lastAttendedAt: "2026-04-01T09:00:00.000+07:00",
    ...overrides,
  }
}

function dropIn(overrides: Partial<DropInVisit> = {}): DropInVisit {
  return {
    id: "drop-in",
    gymId: "gym",
    visitorName: "Visitor Example",
    visitorContact: "visitor@example.com",
    visitCount: 1,
    amount: 75000,
    visitedAt: "2026-04-01T09:00:00.000+07:00",
    ...overrides,
  }
}

function dashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  const gym: GymProfile = {
    id: "gym",
    name: "Demo Gym",
    timezone: "Asia/Jakarta",
    currencyCode: "IDR",
    defaultDropInFeeAmount: 75000,
  }
  const planTiers: PlanTier[] = [
    {
      id: "plan-basic",
      gymId: "gym",
      name: "Basic",
      monthlyPriceAmount: 350000,
      annualPriceAmount: 3600000,
      isActive: true,
      sortOrder: 1,
    },
  ]

  return {
    gym,
    planTiers,
    members: [member()],
    memberships: [membership()],
    payments: [],
    attendance: [],
    dropIns: [],
    ...overrides,
  }
}

type MemberRosterPageMemberFixture = Parameters<
  typeof buildMemberRosterPageRows
>[0][number]
type MemberRosterMembershipFixture =
  MemberRosterPageMemberFixture["memberships"][number]

function memberRosterMembership(
  overrides: Partial<MemberRosterMembershipFixture> = {}
): MemberRosterMembershipFixture {
  return {
    id: "membership",
    memberId: "member",
    planTierId: "plan-basic",
    billingInterval: "MONTHLY" as const,
    status: "ACTIVE" as const,
    currentPeriodEndsAt: "2026-05-01T23:59:59.000+07:00",
    nextBillingDate: "2026-05-02T08:00:00.000+07:00",
    planTier: {
      name: "Basic",
    },
    ...overrides,
  }
}

function memberRosterPageMember(
  overrides: Partial<MemberRosterPageMemberFixture> = {}
): MemberRosterPageMemberFixture {
  return {
    id: "member",
    firstName: "Ari",
    lastName: "Overdue",
    email: "ari@example.com",
    phone: "+62000000001",
    status: "ACTIVE" as const,
    joinDate: "2026-01-01T09:00:00.000+07:00",
    memberships: [memberRosterMembership()],
    _count: {
      attendanceRecords: 0,
      payments: 0,
    },
    ...overrides,
  }
}
