"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PaginationNav } from "@/components/ui/pagination-nav"
import type { MemberStatus, MembershipStatus, PlanTier } from "@/lib/dashboard"
import type {
  BillingRisk,
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
  "overdue",
  "expired",
  "expiring",
  "clear",
]

const statusClasses: Record<MemberStatus, string> = {
  ACTIVE: "border-status/45 bg-status/12 text-status",
  INACTIVE: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  SUSPENDED: "border-alert/45 bg-alert/12 text-alert",
}

const riskClasses: Record<BillingRisk, string> = {
  clear: "border-border bg-muted text-muted-foreground",
  expired: "border-alert/45 bg-alert/12 text-alert",
  expiring: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  overdue: "border-alert/45 bg-alert/12 text-alert",
}

export function MemberRoster({
  members,
  planTiers,
  planNames,
  filters,
  pagination,
  totalMatchingMembers,
  totalMembers,
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
  asOfLabel: string
  initialJoinDate: string
  initialCheckInDate: string
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState(filters.q)

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

  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_19rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            {asOfLabel}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
            Members
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Search the roster, spot billing risk, and prepare account actions.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Visible members
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {totalMatchingMembers} of {totalMembers}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeFiltersCount} active filters
          </p>
        </div>
      </section>

      <MemberCreateForm
        planTiers={planTiers}
        initialJoinDate={initialJoinDate}
      />

      <section
        aria-labelledby="member-filters"
        className="rounded-lg border border-border bg-card p-3 text-card-foreground sm:p-4"
      >
        <form
          action="/members"
          className="flex flex-col gap-3 lg:flex-row lg:items-end"
          onSubmit={handleSearchSubmit}
        >
          <div className="min-w-0 flex-1">
            <h2 id="member-filters" className="text-sm font-semibold">
              Find a member
            </h2>
            <label className="mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm focus-within:ring-3 focus-within:ring-ring/40">
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
            onChange={(value) => navigateFilters({ plan: value as PlanFilter })}
          />
          <FilterSelect
            label="Billing risk"
            name="risk"
            value={filters.risk}
            options={riskOptions}
            formatOption={formatRiskFilter}
            onChange={(value) => navigateFilters({ risk: value as RiskFilter })}
          />

          <Button
            type="submit"
            variant="default"
            size="lg"
            className="min-h-11"
          >
            Search
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <Link href="/members">Reset</Link>
          </Button>
        </form>
      </section>

      <section aria-labelledby="member-roster" className="grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="member-roster" className="text-base font-semibold">
              Member roster
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Plans, account status, renewal timing, and attendance.
            </p>
          </div>
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

            <div className="hidden overflow-hidden rounded-lg border border-border bg-card text-card-foreground md:block">
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
          <MemberRosterEmptyState
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

function MemberRosterEmptyState({
  title,
  detail,
  actionLabel,
  actionHref,
}: {
  title: string
  detail: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-card-foreground">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      {actionLabel && actionHref ? (
        <Button asChild variant="outline" size="sm" className="mt-4 min-h-11">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
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
        className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
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
        <MemberField label="Plan" value={formatPlan(member)} />
        <MemberField label="Joined" value={member.joinDateLabel} />
        <MemberField label="Next bill" value={member.nextBillingDateLabel} />
        <MemberField label="Sessions" value={`${member.sessionsAttended}`} />
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

function MemberField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
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

function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-lg border px-2 py-1 text-[0.7rem] font-medium uppercase",
        statusClasses[status]
      )}
    >
      {formatStatusFilter(status)}
    </span>
  )
}

function RiskBadge({ risk }: { risk: BillingRisk }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-lg border px-2 py-1 text-[0.7rem] font-medium uppercase",
        riskClasses[risk]
      )}
    >
      {formatRiskFilter(risk)}
    </span>
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

function formatMembershipStatus(status: MembershipStatus) {
  return titleCase(status.replace("_", " "))
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

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
