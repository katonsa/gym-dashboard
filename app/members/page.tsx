import {
  getExpiringMemberships,
  getMembersWithMemberships,
  getOverduePayments,
  mockDashboardAsOf,
  mockDashboardData,
} from "@/lib/dashboard"
import { MemberRoster, type MemberRosterRow } from "./member-roster"

const asOf = new Date(mockDashboardAsOf)

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const overdueMemberIds = new Set(
  getOverduePayments(mockDashboardData.payments, asOf).map(
    (payment) => payment.memberId
  )
)

const expiringMemberIds = new Set(
  getExpiringMemberships(mockDashboardData.memberships, { asOf }).map(
    (membership) => membership.memberId
  )
)

const memberRows: MemberRosterRow[] = getMembersWithMemberships(
  mockDashboardData
)
  .map((member) => {
    const fullName = `${member.firstName} ${member.lastName}`
    const billingRisk: MemberRosterRow["billingRisk"] = overdueMemberIds.has(
      member.id
    )
      ? "overdue"
      : expiringMemberIds.has(member.id)
        ? "expiring"
        : "clear"
    const planName: MemberRosterRow["planName"] =
      member.planTier?.name ?? "No plan"

    return {
      id: member.id,
      name: fullName,
      email: member.email ?? "",
      phone: member.phone ?? "",
      status: member.status,
      planName,
      membershipStatus: member.membership?.status ?? "CANCELED",
      billingInterval: member.membership?.billingInterval ?? null,
      joinDateLabel: dateFormatter.format(new Date(member.joinDate)),
      nextBillingDateLabel: member.membership
        ? dateFormatter.format(new Date(member.membership.nextBillingDate))
        : "Not scheduled",
      sessionsAttended: member.sessionsAttended,
      billingRisk,
    }
  })
  .sort((left, right) => left.name.localeCompare(right.name))

export default function MembersPage() {
  return <MemberRoster members={memberRows} asOfLabel="Thursday, Apr 16" />
}
