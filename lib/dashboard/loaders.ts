import { cache } from "react"

import { requireDashboardSession } from "@/lib/auth/server"
import { db } from "@/lib/db"
import {
  mapAttendanceRecord,
  mapDropInVisit,
  mapGymProfile,
  mapMember,
  mapMembership,
  mapMembershipPayment,
  mapPlanTier,
} from "@/lib/dashboard/mappers"
import { getOwnerGym } from "@/lib/dashboard/owner-gym"
import type {
  DashboardData,
  DashboardRouteHref,
  GymProfile,
} from "@/lib/dashboard/types"

export type OverviewDashboardData = Pick<
  DashboardData,
  "gym" | "members" | "memberships" | "payments" | "dropIns"
>

export type MembersDashboardData = Pick<
  DashboardData,
  "gym" | "planTiers" | "members" | "memberships" | "payments" | "attendance"
>

export type SubscriptionsDashboardData = Pick<
  DashboardData,
  "gym" | "planTiers" | "memberships" | "payments" | "dropIns"
>

export type DropInsDashboardData = Pick<DashboardData, "gym" | "dropIns">

const planTierSelect = {
  id: true,
  gymId: true,
  name: true,
  description: true,
  monthlyPriceAmount: true,
  annualPriceAmount: true,
  isActive: true,
  sortOrder: true,
}

const memberSelect = {
  id: true,
  gymId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  status: true,
  joinDate: true,
  lastAttendedAt: true,
  notes: true,
}

const membershipSelect = {
  id: true,
  memberId: true,
  planTierId: true,
  billingInterval: true,
  status: true,
  priceAmount: true,
  startedAt: true,
  currentPeriodEndsAt: true,
  nextBillingDate: true,
  canceledAt: true,
}

const membershipPaymentSelect = {
  id: true,
  gymId: true,
  memberId: true,
  membershipId: true,
  amount: true,
  status: true,
  dueAt: true,
  paidAt: true,
  notes: true,
}

const attendanceRecordSelect = {
  id: true,
  gymId: true,
  memberId: true,
  attendedAt: true,
  source: true,
  notes: true,
}

const dropInVisitSelect = {
  id: true,
  gymId: true,
  visitorName: true,
  visitorContact: true,
  visitCount: true,
  amount: true,
  visitedAt: true,
  notes: true,
}

export const loadOverviewDashboardData = cache(async () => {
  const gym = await requireOwnerGym("/")

  if (!gym) {
    return null
  }

  const [members, memberships, payments, dropIns] = await Promise.all([
    db.member.findMany({
      where: { gymId: gym.id },
      orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: memberSelect,
    }),
    db.membership.findMany({
      where: { member: { gymId: gym.id } },
      orderBy: [{ status: "asc" }, { currentPeriodEndsAt: "asc" }],
      select: membershipSelect,
    }),
    db.membershipPayment.findMany({
      where: { gymId: gym.id },
      orderBy: [{ dueAt: "asc" }],
      select: membershipPaymentSelect,
    }),
    db.dropInVisit.findMany({
      where: { gymId: gym.id },
      orderBy: [{ visitedAt: "desc" }],
      select: dropInVisitSelect,
    }),
  ])

  return {
    gym,
    members: members.map(mapMember),
    memberships: memberships.map(mapMembership),
    payments: payments.map(mapMembershipPayment),
    dropIns: dropIns.map(mapDropInVisit),
  } satisfies OverviewDashboardData
})

export const loadMembersDashboardData = cache(async () => {
  const gym = await requireOwnerGym("/members")

  if (!gym) {
    return null
  }

  const [planTiers, members, memberships, payments, attendance] =
    await Promise.all([
      db.planTier.findMany({
        where: { gymId: gym.id },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: planTierSelect,
      }),
      db.member.findMany({
        where: { gymId: gym.id },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: memberSelect,
      }),
      db.membership.findMany({
        where: { member: { gymId: gym.id } },
        orderBy: [{ status: "asc" }, { nextBillingDate: "asc" }],
        select: membershipSelect,
      }),
      db.membershipPayment.findMany({
        where: { gymId: gym.id },
        orderBy: [{ dueAt: "desc" }],
        select: membershipPaymentSelect,
      }),
      db.attendanceRecord.findMany({
        where: { gymId: gym.id },
        orderBy: [{ attendedAt: "desc" }],
        select: attendanceRecordSelect,
      }),
    ])

  return {
    gym,
    planTiers: planTiers.map(mapPlanTier),
    members: members.map(mapMember),
    memberships: memberships.map(mapMembership),
    payments: payments.map(mapMembershipPayment),
    attendance: attendance.map(mapAttendanceRecord),
  } satisfies MembersDashboardData
})

export const loadSubscriptionsDashboardData = cache(async () => {
  const gym = await requireOwnerGym("/subscriptions")

  if (!gym) {
    return null
  }

  const [planTiers, memberships, payments, dropIns] = await Promise.all([
    db.planTier.findMany({
      where: { gymId: gym.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: planTierSelect,
    }),
    db.membership.findMany({
      where: { member: { gymId: gym.id } },
      orderBy: [{ status: "asc" }, { startedAt: "desc" }],
      select: membershipSelect,
    }),
    db.membershipPayment.findMany({
      where: { gymId: gym.id },
      orderBy: [{ dueAt: "desc" }],
      select: membershipPaymentSelect,
    }),
    db.dropInVisit.findMany({
      where: { gymId: gym.id },
      orderBy: [{ visitedAt: "desc" }],
      select: dropInVisitSelect,
    }),
  ])

  return {
    gym,
    planTiers: planTiers.map(mapPlanTier),
    memberships: memberships.map(mapMembership),
    payments: payments.map(mapMembershipPayment),
    dropIns: dropIns.map(mapDropInVisit),
  } satisfies SubscriptionsDashboardData
})

export const loadDropInsDashboardData = cache(async () => {
  const gym = await requireOwnerGym("/drop-ins")

  if (!gym) {
    return null
  }

  const dropIns = await db.dropInVisit.findMany({
    where: { gymId: gym.id },
    orderBy: [{ visitedAt: "desc" }],
    select: dropInVisitSelect,
  })

  return {
    gym,
    dropIns: dropIns.map(mapDropInVisit),
  } satisfies DropInsDashboardData
})

async function requireOwnerGym(
  nextPath: DashboardRouteHref
): Promise<GymProfile | null> {
  const session = await requireDashboardSession(nextPath)
  const gym = await getOwnerGym(session.user.id)

  return gym ? mapGymProfile(gym) : null
}
