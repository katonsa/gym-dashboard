import { buildMemberRosterRows } from "@/lib/dashboard/member-roster"
import { loadMembersDashboardData } from "@/lib/dashboard/loaders"
import type { DashboardData } from "@/lib/dashboard"
import { MemberRoster } from "./member-roster"

export default async function MembersPage() {
  const membersData = await loadMembersDashboardData()

  if (!membersData) {
    return (
      <MembersEmptyState
        title="No gym is connected to this owner account."
        detail="Create or assign a gym for this owner before member records can appear."
      />
    )
  }

  const asOf = new Date()
  const dashboardData = {
    ...membersData,
    dropIns: [],
  } satisfies DashboardData
  const memberRows = buildMemberRosterRows(dashboardData, asOf)
  const planNames = Array.from(
    new Set([
      ...membersData.planTiers.map((plan) => plan.name),
      ...memberRows.map((member) => member.planName),
    ])
  )
    .filter((planName) => planName !== "No plan")
    .sort((left, right) => left.localeCompare(right))

  return (
    <MemberRoster
      members={memberRows}
      planTiers={membersData.planTiers}
      planNames={planNames}
      asOfLabel={formatDashboardDate(asOf, membersData.gym.timezone)}
      initialJoinDate={formatDateInput(asOf, membersData.gym.timezone)}
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

function formatDateInput(date: Date, timeZone: string) {
  const dateParts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date)
  const partValue = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((part) => part.type === type)?.value ?? ""

  return `${partValue("year")}-${partValue("month")}-${partValue("day")}`
}

function MembersEmptyState({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-card-foreground">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}
