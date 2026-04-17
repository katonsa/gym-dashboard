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

export function getMembersQuery(gymId: string) {
  return {
    where: { gymId },
    orderBy: [{ lastName: ascending }, { firstName: ascending }],
    select: memberSelect,
  }
}

export function getOverviewMembersQuery(gymId: string) {
  return {
    where: { gymId },
    orderBy: [
      { status: ascending },
      { lastName: ascending },
      { firstName: ascending },
    ],
    select: memberSelect,
  }
}

export function getMembershipsQuery(gymId: string) {
  return {
    where: { member: { gymId } },
    orderBy: [{ status: ascending }, { nextBillingDate: ascending }],
    select: membershipSelect,
  }
}

export function getOverviewMembershipsQuery(gymId: string) {
  return {
    where: { member: { gymId } },
    orderBy: [{ status: ascending }, { currentPeriodEndsAt: ascending }],
    select: membershipSelect,
  }
}

export function getSubscriptionMembershipsQuery(gymId: string) {
  return {
    where: { member: { gymId } },
    orderBy: [{ status: ascending }, { startedAt: descending }],
    select: membershipSelect,
  }
}

export function getMembershipPaymentsQuery(gymId: string) {
  return {
    where: { gymId },
    orderBy: [{ dueAt: descending }],
    select: membershipPaymentSelect,
  }
}

export function getOverviewMembershipPaymentsQuery(gymId: string) {
  return {
    where: { gymId },
    orderBy: [{ dueAt: ascending }],
    select: membershipPaymentSelect,
  }
}

export function getAttendanceRecordsQuery(gymId: string) {
  return {
    where: { gymId },
    orderBy: [{ attendedAt: descending }],
    select: attendanceRecordSelect,
  }
}

export function getDropInVisitsQuery(gymId: string) {
  return {
    where: { gymId },
    orderBy: [{ visitedAt: descending }],
    select: dropInVisitSelect,
  }
}
