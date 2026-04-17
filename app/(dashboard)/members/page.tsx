import {
  getExpiringMemberships,
  getMembersWithMemberships,
  getOverduePayments,
  mockDashboardData,
} from "@/lib/dashboard"
import { MemberRoster, type MemberRosterRow } from "./member-roster"

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export default async function MembersPage() {
  const asOf = new Date()
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

  return (
    <MemberRoster
      members={memberRows}
      asOfLabel={formatDashboardDate(asOf, mockDashboardData.gym.timezone)}
    />
  )
}

function formatDashboardDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date)
}
