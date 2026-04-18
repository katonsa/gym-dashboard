import {
  getExpiringMemberships,
  getMembersWithMemberships,
  getOverduePayments,
} from "./calculations.ts"
import type {
  BillingInterval,
  DashboardData,
  MemberStatus,
  Membership,
  MembershipStatus,
  PlanTier,
  PlanTierName,
} from "./types.ts"

export type BillingRisk = "clear" | "expiring" | "overdue"
export type StatusFilter = "all" | MemberStatus
export type PlanFilter = "all" | PlanTierName | "No plan"
export type RiskFilter = "all" | BillingRisk

export type MemberRosterFilters = {
  q: string
  status: StatusFilter
  plan: PlanFilter
  risk: RiskFilter
}

export type MemberRosterRow = {
  id: string
  name: string
  email: string
  phone: string
  status: MemberStatus
  planName: PlanTierName | "No plan"
  membershipStatus: MembershipStatus
  billingInterval: BillingInterval | null
  joinDateLabel: string
  nextBillingDateLabel: string
  sessionsAttended: number
  billingRisk: BillingRisk
}

type DateValue = Date | string

export type MemberRosterPageMember = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  status: MemberStatus
  joinDate: DateValue
  memberships: Array<
    Pick<
      Membership,
      "id" | "memberId" | "planTierId" | "billingInterval" | "status"
    > & {
      currentPeriodEndsAt: DateValue
      nextBillingDate: DateValue
      planTier: Pick<PlanTier, "name">
    }
  >
  _count: {
    attendanceRecords: number
    payments: number
  }
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const validStatuses = new Set<StatusFilter>([
  "all",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
])
const validRisks = new Set<RiskFilter>(["all", "clear", "expiring", "overdue"])

export function buildMemberRosterRows(data: DashboardData, asOf = new Date()) {
  const overdueMemberIds = new Set(
    getOverduePayments(data.payments, asOf).map((payment) => payment.memberId)
  )
  const expiringMemberIds = new Set(
    getExpiringMemberships(data.memberships, { asOf }).map(
      (membership) => membership.memberId
    )
  )

  return getMembersWithMemberships(data)
    .map((member) => {
      const fullName = `${member.firstName} ${member.lastName}`
      const billingRisk: MemberRosterRow["billingRisk"] = overdueMemberIds.has(
        member.id
      )
        ? "overdue"
        : expiringMemberIds.has(member.id)
          ? "expiring"
          : "clear"

      return {
        id: member.id,
        name: fullName,
        email: member.email ?? "",
        phone: member.phone ?? "",
        status: member.status,
        planName: member.planTier?.name ?? "No plan",
        membershipStatus: member.membership?.status ?? "CANCELED",
        billingInterval: member.membership?.billingInterval ?? null,
        joinDateLabel: dateFormatter.format(new Date(member.joinDate)),
        nextBillingDateLabel: member.membership
          ? dateFormatter.format(new Date(member.membership.nextBillingDate))
          : "Not scheduled",
        sessionsAttended: member.sessionsAttended,
        billingRisk,
      } satisfies MemberRosterRow
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function buildMemberRosterPageRows(
  members: MemberRosterPageMember[],
  asOf = new Date()
) {
  return members.map((member) => {
    const membership = member.memberships[0]
    const billingRisk = getMemberRosterPageBillingRisk(member, asOf)

    return {
      id: member.id,
      name: `${member.firstName} ${member.lastName}`,
      email: member.email ?? "",
      phone: member.phone ?? "",
      status: member.status,
      planName: membership?.planTier.name ?? "No plan",
      membershipStatus: membership?.status ?? "CANCELED",
      billingInterval: membership?.billingInterval ?? null,
      joinDateLabel: dateFormatter.format(new Date(member.joinDate)),
      nextBillingDateLabel: membership
        ? dateFormatter.format(new Date(membership.nextBillingDate))
        : "Not scheduled",
      sessionsAttended: member._count.attendanceRecords,
      billingRisk,
    } satisfies MemberRosterRow
  })
}

export function parseMemberRosterFilters(searchParams: {
  q?: string | string[]
  status?: string | string[]
  plan?: string | string[]
  risk?: string | string[]
}): MemberRosterFilters {
  const q = getFirstSearchParamValue(searchParams.q)?.trim() ?? ""
  const statusValue = getFirstSearchParamValue(searchParams.status)
  const riskValue = getFirstSearchParamValue(searchParams.risk)
  const planValue = getFirstSearchParamValue(searchParams.plan)?.trim()

  return {
    q,
    status: validStatuses.has(statusValue as StatusFilter)
      ? (statusValue as StatusFilter)
      : "all",
    plan: planValue && planValue.length > 0 ? planValue : "all",
    risk: validRisks.has(riskValue as RiskFilter)
      ? (riskValue as RiskFilter)
      : "all",
  }
}

function getMemberRosterPageBillingRisk(
  member: MemberRosterPageMember,
  asOf: Date
): BillingRisk {
  if (member._count.payments > 0) {
    return "overdue"
  }

  const membership = member.memberships[0]

  if (!membership || membership.status !== "ACTIVE") {
    return "clear"
  }

  return isMembershipExpiring(membership, asOf) ? "expiring" : "clear"
}

function isMembershipExpiring(
  membership: {
    billingInterval: BillingInterval
    currentPeriodEndsAt: DateValue
    status: MembershipStatus
  },
  asOf: Date
) {
  if (membership.status !== "ACTIVE") {
    return false
  }

  const daysRemaining = Math.floor(
    (new Date(membership.currentPeriodEndsAt).getTime() - asOf.getTime()) /
      (24 * 60 * 60 * 1000)
  )
  const windowDays = membership.billingInterval === "ANNUAL" ? 30 : 7

  return daysRemaining >= 0 && daysRemaining <= windowDays
}

function getFirstSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}
