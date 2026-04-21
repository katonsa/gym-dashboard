import { cache } from "react"

import { requireDashboardSession } from "@/lib/auth/server"
import { db } from "@/lib/db"
import {
  getDropInSummary,
  getOverdueAgingSummary,
  getOverviewAlerts,
  getOverviewSummary,
  getSubscriptionSummary,
  type DashboardDb,
  type DropInSummary,
  type OverdueAgingSummary,
  type OverviewAggregateOptions,
  type OverviewSetupState,
  type SubscriptionSummary,
} from "@/lib/dashboard/aggregates"
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
  buildMemberRosterPageRows,
  type MemberRosterFilters,
  type MemberRosterRow,
} from "@/lib/dashboard/member-roster"
import {
  buildDropInVisitorLookupOptions,
  type DropInVisitorLookupOption,
} from "@/lib/dashboard/drop-in-visitor-lookup"
import {
  getPrismaOffsetArgs,
  type PaginatedResult,
  type PaginationParams,
} from "@/lib/dashboard/pagination"
import { getOwnerGym } from "@/lib/dashboard/owner-gym"
import {
  getDropInVisitsPageQuery,
  getMemberRosterPageQuery,
  getMemberRosterPageWhere,
  getMemberAttendancePageQuery,
  getMemberPaymentsPageQuery,
  getPlanTiersQuery,
} from "@/lib/dashboard/query-scopes"
import { getGymLocalDayBoundary } from "@/lib/dashboard/date-boundaries"
import type {
  AttendanceRecord,
  DashboardAlert,
  DashboardRouteHref,
  DashboardSummary,
  DropInVisit,
  GymProfile,
  Member,
  Membership,
  MembershipPayment,
  PlanTier,
} from "@/lib/dashboard/types"

const aggregateDb = db as unknown as DashboardDb

export type OverviewSummaryDashboardData = {
  gym: GymProfile
  summary: DashboardSummary
  setupState: OverviewSetupState
}

export type MemberRosterPageData = {
  gym: GymProfile
  planTiers: PlanTier[]
  members: PaginatedResult<MemberRosterRow>
  totalMembers: number
  attentionMembers: number
}

export type SubscriptionsSummaryDashboardData = {
  gym: GymProfile
  subscriptionSummary: SubscriptionSummary
}

export type DropInsSummaryDashboardData = {
  gym: GymProfile
  dropInSummary: DropInSummary
}

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

export const loadOverviewSummary = cache(
  async (
    options: OverviewAggregateOptions = {}
  ): Promise<OverviewSummaryDashboardData | null> => {
    const gym = await requireOwnerGym("/")

    if (!gym) {
      return null
    }

    const asOf = options.asOf ?? new Date()
    const membershipAsOf = getGymLocalDayBoundary(asOf, gym.timezone)
    const result = await getOverviewSummary(
      gym.id,
      gym.currencyCode,
      { ...options, asOf, membershipAsOf, timeZone: gym.timezone },
      aggregateDb
    )

    return {
      gym,
      ...result,
    }
  }
)

export const loadOverviewAlerts = cache(
  async (
    options: OverviewAggregateOptions = {}
  ): Promise<DashboardAlert[] | null> => {
    const gym = await requireOwnerGym("/")

    if (!gym) {
      return null
    }

    const asOf = options.asOf ?? new Date()
    const membershipAsOf = getGymLocalDayBoundary(asOf, gym.timezone)

    return getOverviewAlerts(
      gym.id,
      gym.currencyCode,
      { ...options, asOf, membershipAsOf, timeZone: gym.timezone },
      aggregateDb
    )
  }
)

export const loadOverdueAgingSummary = cache(
  async (
    options: { asOf?: Date } = {}
  ): Promise<OverdueAgingSummary | null> => {
    const gym = await requireOwnerGym("/")

    if (!gym) {
      return null
    }

    const asOf = options.asOf ?? new Date()

    return getOverdueAgingSummary(gym.id, asOf, aggregateDb)
  }
)

export const loadMemberRosterPage = cache(
  async (
    filters: MemberRosterFilters,
    pagination: PaginationParams,
    asOf = new Date()
  ): Promise<MemberRosterPageData | null> => {
    const gym = await requireOwnerGym("/members")

    if (!gym) {
      return null
    }

    const membershipAsOf = getGymLocalDayBoundary(asOf, gym.timezone)
    const where = getMemberRosterPageWhere(
      gym.id,
      filters,
      asOf,
      membershipAsOf
    )
    const attentionWhere = getMemberRosterPageWhere(
      gym.id,
      { q: "", status: "all", plan: "all", risk: "attention" },
      asOf,
      membershipAsOf
    )
    const [planTiers, totalMembers, attentionMembers, total] =
      await Promise.all([
        db.planTier.findMany(getPlanTiersQuery(gym.id)),
        db.member.count({
          where: {
            gymId: gym.id,
          },
        }),
        db.member.count({ where: attentionWhere }),
        db.member.count({ where }),
      ])
    const pageCount =
      total === 0 ? 0 : Math.ceil(total / Math.max(1, pagination.pageSize))
    const page =
      pageCount === 0 ? 1 : Math.min(Math.max(1, pagination.page), pageCount)
    const { skip, take } = getPrismaOffsetArgs({
      page,
      pageSize: pagination.pageSize,
    })
    const members = await db.member.findMany(
      getMemberRosterPageQuery(where, skip, take, asOf)
    )

    return {
      gym,
      planTiers: planTiers.map(mapPlanTier),
      members: {
        rows: buildMemberRosterPageRows(members, membershipAsOf),
        total,
        page,
        pageSize: take,
        pageCount,
      },
      totalMembers,
      attentionMembers,
    }
  }
)

export const loadSubscriptionSummary = cache(async (asOf = new Date()) => {
  const gym = await requireOwnerGym("/subscriptions")

  if (!gym) {
    return null
  }

  const planTiers = await db.planTier.findMany(getPlanTiersQuery(gym.id))
  const mappedPlanTiers = planTiers.map(mapPlanTier)
  const revenueAsOf = getGymLocalDayBoundary(asOf, gym.timezone)

  return {
    gym,
    subscriptionSummary: await getSubscriptionSummary(
      gym.id,
      mappedPlanTiers,
      asOf,
      revenueAsOf,
      aggregateDb,
      gym.timezone
    ),
  } satisfies SubscriptionsSummaryDashboardData
})

export const loadDropInSummary = cache(
  async (
    options: OverviewAggregateOptions = {}
  ): Promise<DropInsSummaryDashboardData | null> => {
    const gym = await requireOwnerGym("/drop-ins")

    if (!gym) {
      return null
    }

    return {
      gym,
      dropInSummary: await getDropInSummary(
        gym.id,
        { ...options, timeZone: gym.timezone },
        aggregateDb
      ),
    }
  }
)

export const loadDropInLogPage = cache(
  async (
    pagination: PaginationParams
  ): Promise<PaginatedResult<DropInVisit> | null> => {
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

export const loadDropInVisitorLookupOptions = cache(
  async (): Promise<DropInVisitorLookupOption[] | null> => {
    const gym = await requireOwnerGym("/drop-ins")

    if (!gym) {
      return null
    }

    const dropIns = await db.dropInVisit.findMany({
      where: {
        gymId: gym.id,
        OR: [{ visitorName: { not: null } }, { visitorContact: { not: null } }],
      },
      orderBy: [{ visitedAt: "desc" }, { id: "desc" }],
      take: 250,
      select: {
        visitorName: true,
        visitorContact: true,
        visitedAt: true,
      },
    })

    return buildDropInVisitorLookupOptions(dropIns)
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
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
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
