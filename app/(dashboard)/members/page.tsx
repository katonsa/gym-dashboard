import { parseMemberRosterFilters } from "@/lib/dashboard/member-roster"
import { loadMemberRosterPage } from "@/lib/dashboard/loaders"
import { parsePaginationParams } from "@/lib/dashboard"
import { MemberRoster } from "./member-roster"

type MembersPageProps = {
  searchParams: Promise<{
    q?: string | string[]
    status?: string | string[]
    plan?: string | string[]
    risk?: string | string[]
    page?: string | string[]
  }>
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const resolvedSearchParams = await searchParams
  const asOf = new Date()
  const filters = parseMemberRosterFilters(resolvedSearchParams)
  const pagination = await parsePaginationParams(resolvedSearchParams)
  const membersData = await loadMemberRosterPage(filters, pagination, asOf)

  if (!membersData) {
    return (
      <MembersEmptyState
        title="No gym is connected to this owner account."
        detail="Create or assign a gym for this owner before member records can appear."
      />
    )
  }

  const planNames = Array.from(
    new Set([
      ...membersData.planTiers.map((plan) => plan.name),
      "No plan",
      filters.plan !== "all" ? filters.plan : null,
    ])
  )
    .filter((planName): planName is string => Boolean(planName))
    .sort((left, right) => left.localeCompare(right))

  return (
    <MemberRoster
      members={membersData.members.rows}
      planTiers={membersData.planTiers}
      planNames={planNames}
      filters={filters}
      pagination={{
        page: membersData.members.page,
        pageCount: membersData.members.pageCount,
      }}
      totalMatchingMembers={membersData.members.total}
      totalMembers={membersData.totalMembers}
      asOfLabel={formatDashboardDate(asOf, membersData.gym.timezone)}
      initialJoinDate={formatDateInput(asOf, membersData.gym.timezone)}
      initialCheckInDate={formatDateInput(asOf, membersData.gym.timezone)}
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
