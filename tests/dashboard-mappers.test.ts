import { expect, test } from "vitest"

import type { AttendanceRecordModel } from "../lib/generated/prisma/models/AttendanceRecord.ts"
import type { DropInVisitModel } from "../lib/generated/prisma/models/DropInVisit.ts"
import type { GymModel } from "../lib/generated/prisma/models/Gym.ts"
import type { MemberModel } from "../lib/generated/prisma/models/Member.ts"
import type { MembershipModel } from "../lib/generated/prisma/models/Membership.ts"
import type { MembershipPaymentModel } from "../lib/generated/prisma/models/MembershipPayment.ts"
import type { PlanTierModel } from "../lib/generated/prisma/models/PlanTier.ts"
import {
  mapAttendanceRecord,
  mapDropInVisit,
  mapGymProfile,
  mapMember,
  mapMembership,
  mapMembershipPayment,
  mapPlanTier,
} from "../lib/dashboard/mappers.ts"

const createdAt = new Date("2026-04-16T01:00:00.000Z")
const updatedAt = new Date("2026-04-16T02:00:00.000Z")

test("maps database gym and arbitrary plan names to dashboard types", () => {
  const gym = {
    id: "gym-1",
    name: "Foundry Gym",
    timezone: "Asia/Jakarta",
    currencyCode: "SGD",
    defaultDropInFeeAmount: 2500,
    ownerId: "owner-1",
    createdAt,
    updatedAt,
  } satisfies GymModel

  const planTier = {
    id: "plan-1",
    gymId: gym.id,
    name: "Founders",
    normalizedName: "founders",
    description: null,
    monthlyPriceAmount: 10000,
    annualPriceAmount: 100000,
    isActive: true,
    sortOrder: 1,
    createdAt,
    updatedAt,
  } satisfies PlanTierModel

  expect(mapGymProfile(gym)).toStrictEqual({
    id: "gym-1",
    name: "Foundry Gym",
    timezone: "Asia/Jakarta",
    currencyCode: "SGD",
    defaultDropInFeeAmount: 2500,
  })
  expect(mapPlanTier(planTier)).toStrictEqual({
    id: "plan-1",
    gymId: "gym-1",
    name: "Founders",
    description: undefined,
    monthlyPriceAmount: 10000,
    annualPriceAmount: 100000,
    isActive: true,
    sortOrder: 1,
  })
})

test("maps member, membership, payment, attendance, and drop-in rows", () => {
  const joinDate = new Date("2026-01-02T03:04:05.000Z")
  const periodEnd = new Date("2026-02-02T03:04:05.000Z")
  const billingDate = new Date("2026-02-03T03:04:05.000Z")
  const paidAt = new Date("2026-01-03T03:04:05.000Z")

  const member = {
    id: "member-1",
    gymId: "gym-1",
    firstName: "Ari",
    lastName: "Pratama",
    email: null,
    phone: "+6201",
    status: "ACTIVE",
    joinDate,
    lastAttendedAt: null,
    notes: null,
    createdAt,
    updatedAt,
  } satisfies MemberModel

  const membership = {
    id: "membership-1",
    memberId: member.id,
    planTierId: "plan-1",
    billingInterval: "MONTHLY",
    status: "ACTIVE",
    priceAmount: 10000,
    startedAt: joinDate,
    currentPeriodEndsAt: periodEnd,
    nextBillingDate: billingDate,
    canceledAt: null,
    createdAt,
    updatedAt,
  } satisfies MembershipModel

  const payment = {
    id: "payment-1",
    gymId: "gym-1",
    memberId: member.id,
    membershipId: membership.id,
    amount: 10000,
    status: "PAID",
    dueAt: joinDate,
    paidAt,
    notes: null,
    createdAt,
    updatedAt,
  } satisfies MembershipPaymentModel

  const attendanceRecord = {
    id: "attendance-1",
    gymId: "gym-1",
    memberId: member.id,
    attendedAt: paidAt,
    source: "MANUAL",
    notes: null,
    createdAt,
  } satisfies AttendanceRecordModel

  const dropInVisit = {
    id: "drop-in-1",
    gymId: "gym-1",
    visitorName: null,
    visitorContact: "guest@example.com",
    normalizedVisitorContact: "guest@example.com",
    visitCount: 2,
    amount: 5000,
    visitedAt: paidAt,
    notes: null,
    createdAt,
    updatedAt,
  } satisfies DropInVisitModel

  expect(mapMember(member)).toStrictEqual({
    id: "member-1",
    gymId: "gym-1",
    firstName: "Ari",
    lastName: "Pratama",
    email: undefined,
    phone: "+6201",
    status: "ACTIVE",
    joinDate: "2026-01-02T03:04:05.000Z",
    lastAttendedAt: undefined,
    notes: undefined,
  })
  expect(mapMembership(membership)).toStrictEqual({
    id: "membership-1",
    memberId: "member-1",
    planTierId: "plan-1",
    billingInterval: "MONTHLY",
    status: "ACTIVE",
    priceAmount: 10000,
    startedAt: "2026-01-02T03:04:05.000Z",
    currentPeriodEndsAt: "2026-02-02T03:04:05.000Z",
    nextBillingDate: "2026-02-03T03:04:05.000Z",
    canceledAt: undefined,
  })
  expect(mapMembershipPayment(payment)).toStrictEqual({
    id: "payment-1",
    gymId: "gym-1",
    memberId: "member-1",
    membershipId: "membership-1",
    amount: 10000,
    status: "PAID",
    dueAt: "2026-01-02T03:04:05.000Z",
    paidAt: "2026-01-03T03:04:05.000Z",
    notes: undefined,
  })
  expect(mapAttendanceRecord(attendanceRecord)).toStrictEqual({
    id: "attendance-1",
    gymId: "gym-1",
    memberId: "member-1",
    attendedAt: "2026-01-03T03:04:05.000Z",
    source: "MANUAL",
    notes: undefined,
  })
  expect(mapDropInVisit(dropInVisit)).toStrictEqual({
    id: "drop-in-1",
    gymId: "gym-1",
    visitorName: undefined,
    visitorContact: "guest@example.com",
    visitCount: 2,
    amount: 5000,
    visitedAt: "2026-01-03T03:04:05.000Z",
    notes: undefined,
  })
})
