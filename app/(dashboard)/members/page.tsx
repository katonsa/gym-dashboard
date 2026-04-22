import type { Metadata } from "next"

import { EmptyState } from "@/components/dashboard/empty-state"
import { parseMemberRosterFilters } from "@/lib/dashboard/member-roster"
import { loadMemberRosterPage } from "@/lib/dashboard/loaders"
import {
  formatDashboardDate,
  formatDateInput,
  parsePaginationParams,
} from "@/lib/dashboard"
import { MemberRoster } from "./member-roster"

export const metadata: Metadata = {
  title: "Members",
}

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
      <EmptyState
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
      attentionMembers={membersData.attentionMembers}
      asOfLabel={formatDashboardDate(asOf, membersData.gym.timezone)}
      initialJoinDate={formatDateInput(asOf, membersData.gym.timezone)}
      initialCheckInDate={formatDateInput(asOf, membersData.gym.timezone)}
    />
  )
}
