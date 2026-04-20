import assert from "node:assert/strict"
import test from "node:test"

import {
  getCurrentDisplayMembership,
  getExpiringMemberships,
  getExpiringMembershipPeriodText,
  getMembershipDisplayStatus,
  isExpired,
} from "../lib/dashboard/calculations.ts"
import {
  buildMemberRosterPageRows,
  parseMemberRosterFilters,
} from "../lib/dashboard/member-roster.ts"
import type { Membership } from "../lib/dashboard/types.ts"

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

test("detects de facto expired memberships against a gym-local boundary", () => {
  const sameGymDayBoundary = new Date("2026-04-18T17:00:00.000Z")
  const nextGymDayBoundary = new Date("2026-04-19T17:00:00.000Z")
  const endingOnLocalDate = membership({
    currentPeriodEndsAt: "2026-04-19T00:00:00.000Z",
  })

  assert.equal(isExpired(endingOnLocalDate, sameGymDayBoundary), false)
  assert.equal(isExpired(endingOnLocalDate, nextGymDayBoundary), true)
})

test("returns display membership statuses for active, expiring, and expired rows", () => {
  assert.equal(
    getMembershipDisplayStatus(
      membership({ currentPeriodEndsAt: "2026-05-20T00:00:00.000Z" }),
      asOf
    ),
    "active"
  )
  assert.equal(
    getMembershipDisplayStatus(
      membership({ currentPeriodEndsAt: "2026-04-20T00:00:00.000Z" }),
      asOf
    ),
    "expiring"
  )
  assert.equal(
    getMembershipDisplayStatus(
      membership({ currentPeriodEndsAt: "2026-04-10T00:00:00.000Z" }),
      asOf
    ),
    "expired"
  )
  assert.equal(
    getMembershipDisplayStatus(membership({ status: "EXPIRED" }), asOf),
    "expired"
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
        memberRosterPageMember({
          id: "expired-member",
          firstName: "Dewi",
          lastName: "Expired",
          memberships: [
            memberRosterMembership({
              currentPeriodEndsAt: "2026-04-10T23:59:59.000+07:00",
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
      ["expired-member", 0, "expired"],
    ]
  )
})

test("uses the active or expired membership for roster risk display", () => {
  assert.deepEqual(
    buildMemberRosterPageRows(
      [
        memberRosterPageMember({
          id: "past-due-masks-expiring-member",
          memberships: [
            memberRosterMembership({
              id: "newer-past-due-membership",
              status: "PAST_DUE",
              currentPeriodEndsAt: "2026-05-20T23:59:59.000+07:00",
            }),
            memberRosterMembership({
              id: "older-expiring-membership",
              currentPeriodEndsAt: "2026-04-16T23:59:59.000+07:00",
            }),
          ],
        }),
        memberRosterPageMember({
          id: "past-due-masks-expired-member",
          memberships: [
            memberRosterMembership({
              id: "newer-past-due-membership",
              status: "PAST_DUE",
              currentPeriodEndsAt: "2026-05-20T23:59:59.000+07:00",
            }),
            memberRosterMembership({
              id: "older-expired-membership",
              currentPeriodEndsAt: "2026-04-10T23:59:59.000+07:00",
            }),
          ],
        }),
        memberRosterPageMember({
          id: "overdue-payment-member",
          memberships: [
            memberRosterMembership({
              id: "newer-past-due-membership",
              status: "PAST_DUE",
              currentPeriodEndsAt: "2026-05-20T23:59:59.000+07:00",
            }),
            memberRosterMembership({
              id: "older-expiring-membership",
              currentPeriodEndsAt: "2026-04-16T23:59:59.000+07:00",
            }),
          ],
          _count: {
            attendanceRecords: 0,
            payments: 1,
          },
        }),
      ],
      asOf
    ).map((row) => [row.id, row.billingRisk]),
    [
      ["past-due-masks-expiring-member", "expiring"],
      ["past-due-masks-expired-member", "expired"],
      ["overdue-payment-member", "overdue"],
    ]
  )
})

test("selects the same current display membership for roster and profile data", () => {
  const memberships = [
    memberRosterMembership({
      id: "newer-past-due-membership",
      status: "PAST_DUE",
      currentPeriodEndsAt: "2026-05-20T23:59:59.000+07:00",
    }),
    memberRosterMembership({
      id: "older-active-membership",
      currentPeriodEndsAt: "2026-04-16T23:59:59.000+07:00",
    }),
  ]

  assert.equal(
    getCurrentDisplayMembership(memberships)?.id,
    "older-active-membership"
  )
})

test("formats same-day expiring membership period text", () => {
  assert.equal(getExpiringMembershipPeriodText(0), "Expires today.")
  assert.equal(getExpiringMembershipPeriodText(1), "Expires in 1 day.")
  assert.equal(getExpiringMembershipPeriodText(2), "Expires in 2 days.")
})

test("parses member roster filters from URL search params", () => {
  assert.deepEqual(
    parseMemberRosterFilters({
      q: " Ari ",
      status: "ACTIVE",
      plan: "Pro",
      risk: "expired",
    }),
    {
      q: "Ari",
      status: "ACTIVE",
      plan: "Pro",
      risk: "expired",
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
