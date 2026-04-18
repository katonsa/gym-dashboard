import assert from "node:assert/strict"
import test from "node:test"

import {
  getExpiringMemberships,
  getOverduePayments,
} from "../lib/dashboard/calculations.ts"
import {
  buildMemberRosterPageRows,
  buildMemberRosterRows,
  parseMemberRosterFilters,
} from "../lib/dashboard/member-roster.ts"
import type {
  DashboardData,
  GymProfile,
  Member,
  Membership,
  MembershipPayment,
  PlanTier,
} from "../lib/dashboard/types.ts"

const asOf = new Date("2026-04-16T09:00:00.000+07:00")

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
