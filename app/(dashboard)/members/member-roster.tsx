"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { Plus, Search } from "lucide-react"

import { RiskBadge, StatusBadge } from "@/components/dashboard/badges"
import { DetailField } from "@/components/dashboard/detail-field"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PaginationNav } from "@/components/ui/pagination-nav"
import {
  formatMembershipStatus,
  titleCase,
  type PlanTier,
} from "@/lib/dashboard"
import type {
  MemberRosterRow,
  MemberRosterFilters,
  PlanFilter,
  RiskFilter,
  StatusFilter,
} from "@/lib/dashboard/member-roster"
import { cn } from "@/lib/utils"
import { MemberCreateForm } from "./member-create-form"
import { MemberQuickCheckInAction } from "./member-quick-checkin-action"
import { MemberStatusAction } from "./member-status-action"

const statusOptions: StatusFilter[] = ["all", "ACTIVE", "INACTIVE", "SUSPENDED"]
const riskOptions: RiskFilter[] = [
  "all",
  "attention",
  "overdue",
  "expired",
  "expiring",
  "clear",
]

export function MemberRoster({
  members,
  planTiers,
  planNames,
  filters,
  pagination,
  totalMatchingMembers,
  totalMembers,
  attentionMembers,
  asOfLabel,
  initialJoinDate,
  initialCheckInDate,
}: {
  members: MemberRosterRow[]
  planTiers: PlanTier[]
  planNames: string[]
  filters: MemberRosterFilters
  pagination: {
    page: number
    pageCount: number
  }
  totalMatchingMembers: number
  totalMembers: number
  attentionMembers: number
  asOfLabel: string
  initialJoinDate: string
  initialCheckInDate: string
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState(filters.q)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)

  React.useEffect(() => {
    setQuery(filters.q)
  }, [filters.q])

  const navigateFilters = React.useCallback(
    (nextFilters: Partial<MemberRosterFilters>) => {
      const href = getMemberRosterHref({
        ...filters,
        ...nextFilters,
      })

      router.push(href, { scroll: false })
    },
    [filters, router]
  )
  const handleSearchSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      navigateFilters({ q: query.trim() })
    },
    [navigateFilters, query]
  )

  const activeFiltersCount = [
    filters.q.length > 0,
    filters.status !== "all",
    filters.plan !== "all",
    filters.risk !== "all",
  ].filter(Boolean).length
  const planOptions = React.useMemo<PlanFilter[]>(
    () => ["all", ...planNames],
    [planNames]
  )
  const emptyState = getEmptyState({
    totalMembers,
    filteredMembers: totalMatchingMembers,
    hasSearch: filters.q.length > 0,
    activeFiltersCount,
  })
  const preservedSearchParams = getPaginationSearchParams(filters)
  const attentionLabel =
    attentionMembers === 1
      ? "1 member needs attention"
      : `${attentionMembers} members need attention`

  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            {asOfLabel}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
            Members
          </h1>
          <Link
            href="/members?risk=attention"
            className="mt-2 inline-flex rounded-sm text-sm leading-6 text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            {attentionLabel}
          </Link>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-11 sm:self-end">
              <Plus />
              Add member
            </Button>
          </DialogTrigger>
          <DialogContent className="!top-0 !right-0 !left-auto !h-dvh !max-w-full !translate-x-0 !translate-y-0 content-start overflow-y-auto rounded-none border-l border-border bg-card p-5 shadow-2xl sm:!max-w-md data-open:slide-in-from-right data-closed:slide-out-to-right">
            <DialogHeader className="pr-8">
              <DialogTitle>Add member</DialogTitle>
              <DialogDescription>
                Create a roster record and start billing when a plan is
                selected.
              </DialogDescription>
            </DialogHeader>
            <MemberCreateForm
              planTiers={planTiers}
              initialJoinDate={initialJoinDate}
              onSaved={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </section>

      <section aria-labelledby="member-roster" className="grid gap-0">
        <div className="rounded-t-lg border border-border bg-card p-3 text-card-foreground sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="member-roster" className="text-base font-semibold">
                Member roster
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {totalMatchingMembers} of {totalMembers}
                </span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Plans, account status, renewal timing, and attendance.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {activeFiltersCount} active filters
            </p>
          </div>

          <form
            action="/members"
            className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end"
            onSubmit={handleSearchSubmit}
          >
            <div className="min-w-0 flex-1">
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm shadow-inner shadow-foreground/5 focus-within:ring-3 focus-within:ring-ring/40">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <span className="sr-only">Search by name, email, or phone</span>
                <input
                  name="q"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, email, or phone"
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
              </label>
            </div>

            <FilterSelect
              label="Status"
              name="status"
              value={filters.status}
              options={statusOptions}
              formatOption={formatStatusFilter}
              onChange={(value) =>
                navigateFilters({ status: value as StatusFilter })
              }
            />
            <FilterSelect
              label="Plan"
              name="plan"
              value={filters.plan}
              options={planOptions}
              formatOption={formatPlanFilter}
              onChange={(value) =>
                navigateFilters({ plan: value as PlanFilter })
              }
            />
            <FilterSelect
              label="Billing risk"
              name="risk"
              value={filters.risk}
              options={riskOptions}
              formatOption={formatRiskFilter}
              onChange={(value) =>
                navigateFilters({ risk: value as RiskFilter })
              }
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="submit"
                variant="default"
                size="lg"
                className="min-h-11"
              >
                <Search />
                Search
              </Button>
              <Link
                href="/members"
                className="inline-flex min-h-11 items-center justify-center rounded-sm px-2 text-sm font-medium text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>

        {members.length > 0 ? (
          <>
            <div className="grid gap-3 md:hidden">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  checkInDate={initialCheckInDate}
                />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-b-lg border-x border-b border-border bg-card text-card-foreground md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b border-border bg-muted/60 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="w-[25%] px-4 py-3 font-medium">Name</th>
                    <th className="w-[13%] px-4 py-3 font-medium">Plan</th>
                    <th className="w-[14%] px-4 py-3 font-medium">Status</th>
                    <th className="w-[12%] px-4 py-3 font-medium">Joined</th>
                    <th className="w-[14%] px-4 py-3 font-medium">Next bill</th>
                    <th className="w-[10%] px-4 py-3 font-medium">Sessions</th>
                    <th className="w-[12%] px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((member) => (
                    <MemberTableRow
                      key={member.id}
                      member={member}
                      checkInDate={initialCheckInDate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationNav
              page={pagination.page}
              pageCount={pagination.pageCount}
              basePath="/members"
              preservedSearchParams={preservedSearchParams}
            />
          </>
        ) : (
          <EmptyState
            title={emptyState.title}
            detail={emptyState.detail}
            actionLabel={emptyState.canReset ? "Clear filters" : undefined}
            actionHref={emptyState.canReset ? "/members" : undefined}
          />
        )}
      </section>
    </div>
  )
}

function FilterSelect({
  label,
  name,
  value,
  options,
  formatOption,
  onChange,
}: {
  label: string
  name: string
  value: string
  options: readonly string[]
  formatOption: (value: string) => string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid min-w-40 gap-1 text-xs font-medium text-muted-foreground uppercase">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm font-normal text-foreground shadow-inner shadow-foreground/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function MemberCard({
  member,
  checkInDate,
}: {
  member: MemberRosterRow
  checkInDate: string
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">
            <Link
              href={`/members/${member.id}`}
              className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {member.name}
            </Link>
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {member.email}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {member.phone}
          </p>
        </div>
        <StatusBadge status={member.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DetailField label="Plan" value={formatPlan(member)} truncate />
        <DetailField label="Joined" value={member.joinDateLabel} truncate />
        <DetailField
          label="Next bill"
          value={member.nextBillingDateLabel}
          truncate
        />
        <DetailField
          label="Sessions"
          value={`${member.sessionsAttended}`}
          truncate
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <RiskBadge risk={member.billingRisk} />
        <QuickActions member={member} checkInDate={checkInDate} />
      </div>
    </article>
  )
}

function MemberTableRow({
  member,
  checkInDate,
}: {
  member: MemberRosterRow
  checkInDate: string
}) {
  return (
    <tr>
      <td className="px-4 py-3 align-top">
        <div className="min-w-0">
          <p className="truncate font-medium">{member.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {member.email}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {member.phone}
          </p>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <p className="font-medium">{formatPlan(member)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatMembershipStatus(member.membershipStatus)}
        </p>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="grid gap-2">
          <StatusBadge status={member.status} />
          <RiskBadge risk={member.billingRisk} />
        </div>
      </td>
      <td className="px-4 py-3 align-top text-muted-foreground">
        {member.joinDateLabel}
      </td>
      <td className="px-4 py-3 align-top text-muted-foreground">
        {member.nextBillingDateLabel}
      </td>
      <td className="px-4 py-3 align-top font-semibold">
        {member.sessionsAttended}
      </td>
      <td className="px-4 py-3 align-top">
        <QuickActions member={member} checkInDate={checkInDate} compact />
      </td>
    </tr>
  )
}

function QuickActions({
  member,
  checkInDate,
  compact = false,
}: {
  member: MemberRosterRow
  checkInDate: string
  compact?: boolean
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", compact && "grid")}>
      <MemberQuickCheckInAction
        memberId={member.id}
        memberName={member.name}
        checkInDate={checkInDate}
      />
      <Button asChild variant="outline" size="sm" className="min-h-11">
        <Link href={`/members/${member.id}`}>View profile</Link>
      </Button>
      <Button asChild variant="outline" size="sm" className="min-h-11">
        <Link href={`/members/${member.id}#plan-change`}>Edit plan</Link>
      </Button>
      <MemberStatusAction
        memberId={member.id}
        memberName={member.name}
        status={member.status}
        compact={compact}
      />
    </div>
  )
}

function formatStatusFilter(value: string) {
  return value === "all" ? "All statuses" : titleCase(value)
}

function formatPlanFilter(value: string) {
  return value === "all" ? "All plans" : value
}

function formatRiskFilter(value: string) {
  if (value === "all") {
    return "All risks"
  }

  if (value === "attention") {
    return "Needs attention"
  }

  if (value === "clear") {
    return "No risk"
  }

  return titleCase(value)
}

function formatPlan(member: MemberRosterRow) {
  return member.billingInterval
    ? `${member.planName} ${titleCase(member.billingInterval)}`
    : member.planName
}

function getEmptyState({
  totalMembers,
  filteredMembers,
  hasSearch,
  activeFiltersCount,
}: {
  totalMembers: number
  filteredMembers: number
  hasSearch: boolean
  activeFiltersCount: number
}) {
  if (totalMembers === 0) {
    return {
      title: "No members yet.",
      detail:
        "Add member records to start tracking plans, renewals, and visits.",
      canReset: false,
    }
  }

  if (filteredMembers > 0) {
    return {
      title: "",
      detail: "",
      canReset: false,
    }
  }

  if (hasSearch) {
    return {
      title: "No search results.",
      detail: "Search a different name, email, or phone.",
      canReset: true,
    }
  }

  if (activeFiltersCount > 0) {
    return {
      title: "No results for these filters.",
      detail: "Clear a filter to widen the roster.",
      canReset: true,
    }
  }

  return {
    title: "No members yet.",
    detail: "Add member records to start tracking plans, renewals, and visits.",
    canReset: false,
  }
}

function getMemberRosterHref(filters: MemberRosterFilters) {
  const params = new URLSearchParams()

  if (filters.q.length > 0) {
    params.set("q", filters.q)
  }

  if (filters.status !== "all") {
    params.set("status", filters.status)
  }

  if (filters.plan !== "all") {
    params.set("plan", filters.plan)
  }

  if (filters.risk !== "all") {
    params.set("risk", filters.risk)
  }

  const queryString = params.toString()

  return queryString.length > 0 ? `/members?${queryString}` : "/members"
}

function getPaginationSearchParams(filters: MemberRosterFilters) {
  return {
    q: filters.q.length > 0 ? filters.q : undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    plan: filters.plan !== "all" ? filters.plan : undefined,
    risk: filters.risk !== "all" ? filters.risk : undefined,
  }
}
