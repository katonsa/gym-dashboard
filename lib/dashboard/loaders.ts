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
import {
  getPrismaOffsetArgs,
  type PaginatedResult,
  type PaginationParams,
} from "@/lib/dashboard/pagination"
import { getOwnerGym } from "@/lib/dashboard/owner-gym"
import {
  getAttendanceRecordsQuery,
  getDropInVisitsPageQuery,
  getDropInVisitsQuery,
  getMemberAttendancePageQuery,
  getMemberPaymentsPageQuery,
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
  AttendanceRecord,
  DashboardData,
  DashboardRouteHref,
  GymProfile,
  Member,
  Membership,
  MembershipPayment,
  PlanTier,
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

export type MemberDetailMembership = Membership & {
  planTier: PlanTier
}

export type MemberDetailDashboardData = {
  gym: GymProfile
  member: Member
  planTiers: PlanTier[]
  memberships: MemberDetailMembership[]
  hasOverduePayments: boolean
}

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

export const loadDropInLogPage = cache(
  async (
    pagination: PaginationParams
  ): Promise<PaginatedResult<DashboardData["dropIns"][number]> | null> => {
    const gym = await requireOwnerGym("/drop-ins")

    if (!gym) {
      return null
    }

    const total = await db.dropInVisit.count({
      where: {
        gymId: gym.id,
      },
    })
    const pageCount =
      total === 0 ? 0 : Math.ceil(total / Math.max(1, pagination.pageSize))
    const page =
      pageCount === 0 ? 1 : Math.min(Math.max(1, pagination.page), pageCount)
    const { skip, take } = getPrismaOffsetArgs({
      page,
      pageSize: pagination.pageSize,
    })
    const dropIns = await db.dropInVisit.findMany(
      getDropInVisitsPageQuery(gym.id, skip, take)
    )

    return {
      rows: dropIns.map(mapDropInVisit),
      total,
      page,
      pageSize: take,
      pageCount,
    }
  }
)

export const loadMemberDetailData = cache(async (memberId: string) => {
  const session = await requireDashboardSession("/members")
  const gym = await getOwnerGym(session.user.id)

  if (!gym) {
    return null
  }

  const [member, planTiers, memberships, overduePaymentsCount] =
    await Promise.all([
      db.member.findFirst({
        where: {
          id: memberId,
          gymId: gym.id,
        },
        select: {
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
        },
      }),
      db.planTier.findMany(getPlanTiersQuery(gym.id)),
      db.membership.findMany({
        where: {
          memberId,
          member: {
            gymId: gym.id,
          },
        },
        orderBy: [{ startedAt: "desc" }],
        select: {
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
          planTier: {
            select: {
              id: true,
              gymId: true,
              name: true,
              description: true,
              monthlyPriceAmount: true,
              annualPriceAmount: true,
              isActive: true,
              sortOrder: true,
            },
          },
        },
      }),
      db.membershipPayment.count({
        where: {
          gymId: gym.id,
          memberId,
          OR: [
            {
              status: "OVERDUE",
            },
            {
              status: "PENDING",
              dueAt: {
                lt: new Date(),
              },
            },
          ],
        },
      }),
    ])

  if (!member) {
    return null
  }

  return {
    gym: mapGymProfile(gym),
    member: mapMember(member),
    planTiers: planTiers.map(mapPlanTier),
    memberships: memberships.map((membership) => ({
      ...mapMembership(membership),
      planTier: mapPlanTier(membership.planTier),
    })),
    hasOverduePayments: overduePaymentsCount > 0,
  } satisfies MemberDetailDashboardData
})

export const loadMemberPaymentsPage = cache(
  async (
    memberId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<MembershipPayment> | null> => {
    const session = await requireDashboardSession("/members")
    const gym = await getOwnerGym(session.user.id)

    if (!gym) {
      return null
    }

    const total = await db.membershipPayment.count({
      where: {
        gymId: gym.id,
        memberId,
      },
    })
    const pageCount =
      total === 0 ? 0 : Math.ceil(total / Math.max(1, pagination.pageSize))
    const page =
      pageCount === 0 ? 1 : Math.min(Math.max(1, pagination.page), pageCount)
    const { skip, take } = getPrismaOffsetArgs({
      page,
      pageSize: pagination.pageSize,
    })
    const payments = await db.membershipPayment.findMany(
      getMemberPaymentsPageQuery(gym.id, memberId, skip, take)
    )

    return {
      rows: payments.map(mapMembershipPayment),
      total,
      page,
      pageSize: take,
      pageCount,
    }
  }
)

export const loadMemberAttendancePage = cache(
  async (
    memberId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<AttendanceRecord> | null> => {
    const session = await requireDashboardSession("/members")
    const gym = await getOwnerGym(session.user.id)

    if (!gym) {
      return null
    }

    const total = await db.attendanceRecord.count({
      where: {
        gymId: gym.id,
        memberId,
      },
    })
    const pageCount =
      total === 0 ? 0 : Math.ceil(total / Math.max(1, pagination.pageSize))
    const page =
      pageCount === 0 ? 1 : Math.min(Math.max(1, pagination.page), pageCount)
    const { skip, take } = getPrismaOffsetArgs({
      page,
      pageSize: pagination.pageSize,
    })
    const attendance = await db.attendanceRecord.findMany(
      getMemberAttendancePageQuery(gym.id, memberId, skip, take)
    )

    return {
      rows: attendance.map(mapAttendanceRecord),
      total,
      page,
      pageSize: take,
      pageCount,
    }
  }
)

async function requireOwnerGym(
  nextPath: DashboardRouteHref
): Promise<GymProfile | null> {
  const session = await requireDashboardSession(nextPath)
  const gym = await getOwnerGym(session.user.id)

  return gym ? mapGymProfile(gym) : null
}
