import {
  getExpiringMemberships,
  getMembersWithMemberships,
  getOverduePayments,
} from "./calculations.ts"
import type {
  BillingInterval,
  DashboardData,
  MemberStatus,
  MembershipStatus,
  PlanTierName,
} from "./types.ts"

export type BillingRisk = "clear" | "expiring" | "overdue"

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

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

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
