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
import {
  getAttendanceRecordsQuery,
  getDropInVisitsQuery,
  getMembersQuery,
  getMembershipPaymentsQuery,
  getMembershipsQuery,
  getOverviewMembersQuery,
  getOverviewMembershipPaymentsQuery,
  getOverviewMembershipsQuery,
  getPlanTiersQuery,
  getSubscriptionMembershipsQuery,
} from "@/lib/dashboard/query-scopes"
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

export const loadOverviewDashboardData = cache(async () => {
  const gym = await requireOwnerGym("/")

  if (!gym) {
    return null
  }

  const [members, memberships, payments, dropIns] = await Promise.all([
    db.member.findMany(getOverviewMembersQuery(gym.id)),
    db.membership.findMany(getOverviewMembershipsQuery(gym.id)),
    db.membershipPayment.findMany(getOverviewMembershipPaymentsQuery(gym.id)),
    db.dropInVisit.findMany(getDropInVisitsQuery(gym.id)),
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
      db.planTier.findMany(getPlanTiersQuery(gym.id)),
      db.member.findMany(getMembersQuery(gym.id)),
      db.membership.findMany(getMembershipsQuery(gym.id)),
      db.membershipPayment.findMany(getMembershipPaymentsQuery(gym.id)),
      db.attendanceRecord.findMany(getAttendanceRecordsQuery(gym.id)),
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
    db.planTier.findMany(getPlanTiersQuery(gym.id)),
    db.membership.findMany(getSubscriptionMembershipsQuery(gym.id)),
    db.membershipPayment.findMany(getMembershipPaymentsQuery(gym.id)),
    db.dropInVisit.findMany(getDropInVisitsQuery(gym.id)),
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

  const dropIns = await db.dropInVisit.findMany(getDropInVisitsQuery(gym.id))

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
