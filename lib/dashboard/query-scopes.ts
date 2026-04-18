import type { Prisma } from "@/lib/generated/prisma/client"
import type { MemberRosterFilters } from "@/lib/dashboard/member-roster"
import type { MembershipStatus } from "@/lib/dashboard/types"

const planTierSelect = {
  id: true,
  gymId: true,
  name: true,
  description: true,
  monthlyPriceAmount: true,
  annualPriceAmount: true,
  isActive: true,
  sortOrder: true,
} as const

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
} as const

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
} as const

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
} as const

const attendanceRecordSelect = {
  id: true,
  gymId: true,
  memberId: true,
  attendedAt: true,
  source: true,
  notes: true,
} as const

const dropInVisitSelect = {
  id: true,
  gymId: true,
  visitorName: true,
  visitorContact: true,
  visitCount: true,
  amount: true,
  visitedAt: true,
  notes: true,
} as const

const ownerGymSelect = {
  id: true,
  name: true,
  timezone: true,
  currencyCode: true,
  defaultDropInFeeAmount: true,
} as const

const ascending = "asc" as const
const descending = "desc" as const
const activeRosterMembershipStatuses: MembershipStatus[] = [
  "ACTIVE",
  "PAST_DUE",
]

export function getOwnerGymQuery(ownerId: string) {
  return {
    where: {
      ownerId,
    },
    orderBy: {
      createdAt: ascending,
    },
    select: ownerGymSelect,
  }
}

export function getPlanTiersQuery(gymId: string) {
  return {
    where: { gymId },
    orderBy: [{ sortOrder: ascending }, { name: ascending }],
    select: planTierSelect,
  }
}

export function getMemberRosterPageWhere(
  gymId: string,
  filters: MemberRosterFilters,
  asOf: Date
): Prisma.MemberWhereInput {
  const where: Prisma.MemberWhereInput = { gymId }
  const and: Prisma.MemberWhereInput[] = []

  if (filters.q.length > 0) {
    and.push({
      OR: [
        { firstName: { contains: filters.q, mode: "insensitive" } },
        { lastName: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { phone: { contains: filters.q, mode: "insensitive" } },
      ],
    })
  }

  if (filters.status !== "all") {
    and.push({
      status: filters.status,
    })
  }

  if (filters.plan !== "all") {
    and.push(getMemberRosterPlanWhere(filters.plan))
  }

  if (filters.risk !== "all") {
    and.push(getMemberRosterRiskWhere(filters.risk, asOf))
  }

  if (and.length > 0) {
    where.AND = and
  }

  return where
}

export function getMemberRosterPageQuery(
  where: Prisma.MemberWhereInput,
  skip: number,
  take: number,
  asOf: Date
) {
  return {
    where,
    orderBy: [
      { lastName: ascending },
      { firstName: ascending },
      { id: ascending },
    ],
    skip,
    take,
    select: {
      ...memberSelect,
      memberships: {
        where: {
          status: {
            in: activeRosterMembershipStatuses,
          },
        },
        orderBy: [{ startedAt: descending }, { id: descending }],
        take: 1,
        select: {
          ...membershipSelect,
          planTier: {
            select: planTierSelect,
          },
        },
      },
      _count: {
        select: {
          attendanceRecords: true,
          payments: {
            where: getOverdueMemberPaymentWhere(asOf),
          },
        },
      },
    },
  }
}

function getMemberRosterPlanWhere(plan: string): Prisma.MemberWhereInput {
  if (plan === "No plan") {
    return {
      memberships: {
        none: {
          status: {
            in: activeRosterMembershipStatuses,
          },
        },
      },
    }
  }

  return {
    memberships: {
      some: {
        status: {
          in: activeRosterMembershipStatuses,
        },
        planTier: {
          name: plan,
        },
      },
    },
  }
}

function getMemberRosterRiskWhere(
  risk: MemberRosterFilters["risk"],
  asOf: Date
): Prisma.MemberWhereInput {
  const overdueWhere: Prisma.MemberWhereInput = {
    payments: {
      some: getOverdueMemberPaymentWhere(asOf),
    },
  }
  const expiringWhere: Prisma.MemberWhereInput = {
    memberships: {
      some: getExpiringMemberMembershipWhere(asOf),
    },
  }

  if (risk === "overdue") {
    return overdueWhere
  }

  if (risk === "expiring") {
    return {
      AND: [
        {
          NOT: overdueWhere,
        },
        expiringWhere,
      ],
    }
  }

  return {
    NOT: [overdueWhere, expiringWhere],
  }
}

function getOverdueMemberPaymentWhere(
  asOf: Date
): Prisma.MembershipPaymentWhereInput {
  return {
    OR: [
      {
        status: "OVERDUE",
      },
      {
        status: "PENDING",
        dueAt: {
          lt: asOf,
        },
      },
    ],
  }
}

function getExpiringMemberMembershipWhere(
  asOf: Date
): Prisma.MembershipWhereInput {
  return {
    status: "ACTIVE",
    currentPeriodEndsAt: {
      gte: asOf,
    },
    OR: [
      {
        billingInterval: "MONTHLY",
        currentPeriodEndsAt: {
          lte: addDays(asOf, 7),
        },
      },
      {
        billingInterval: "ANNUAL",
        currentPeriodEndsAt: {
          lte: addDays(asOf, 30),
        },
      },
    ],
  }
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

export function getDropInVisitsPageQuery(
  gymId: string,
  skip: number,
  take: number
) {
  return {
    where: { gymId },
    orderBy: [{ visitedAt: descending }, { id: descending }],
    skip,
    take,
    select: dropInVisitSelect,
  }
}

export function getMemberPaymentsPageQuery(
  gymId: string,
  memberId: string,
  skip: number,
  take: number
) {
  return {
    where: {
      gymId,
      memberId,
    },
    orderBy: [{ dueAt: descending }, { id: descending }],
    skip,
    take,
    select: membershipPaymentSelect,
  }
}

export function getMemberAttendancePageQuery(
  gymId: string,
  memberId: string,
  skip: number,
  take: number
) {
  return {
    where: {
      gymId,
      memberId,
    },
    orderBy: [{ attendedAt: descending }, { id: descending }],
    skip,
    take,
    select: attendanceRecordSelect,
  }
}
