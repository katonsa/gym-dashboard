"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { AlertCircle, Plus, Search, Users } from "lucide-react"

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
  const activeFiltersLabel =
    activeFiltersCount === 1
      ? "1 active filter"
      : `${activeFiltersCount} active filters`

  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            {asOfLabel}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
            Members
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Search the roster, check people in, and spot billing or renewal work
            from the same queue.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Roster queue
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {totalMatchingMembers}
                </p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Users className="size-5" />
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Showing {totalMatchingMembers} of {totalMembers} members
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="min-h-11 w-full">
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
        </div>
      </section>

      <section
        aria-label="Roster summary"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <SummaryMetric label="Matching" value={`${totalMatchingMembers}`} />
        <SummaryMetric label="Total" value={`${totalMembers}`} />
        <Link
          href="/members?risk=attention"
          className="group rounded-lg border border-border bg-card p-3 text-card-foreground transition-colors outline-none hover:border-primary/35 hover:bg-primary/8 focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Attention
            </p>
            <AlertCircle className="size-4 text-alert" />
          </div>
          <p className="mt-2 text-xl font-semibold">{attentionMembers}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-foreground">
            {attentionLabel}
          </p>
        </Link>
        <SummaryMetric
          label="Filters"
          value={`${activeFiltersCount}`}
          detail={activeFiltersLabel}
        />
      </section>

      <section aria-labelledby="member-roster" className="grid gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-card-foreground sm:p-4">
          <div>
            <div className="min-w-0">
              <h2 id="member-roster" className="text-base font-semibold">
                Member roster
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Plans, status, renewal timing, and attendance.
              </p>
            </div>
          </div>

          <form
            action="/members"
            className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(8.5rem,0.45fr))_auto] xl:items-end"
            onSubmit={handleSearchSubmit}
          >
            <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground uppercase lg:col-span-2 xl:col-span-1">
              Search
              <span className="flex min-h-11 items-center gap-2 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm shadow-inner shadow-foreground/5 focus-within:ring-3 focus-within:ring-ring/40">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <span className="sr-only">Search by name, email, or phone</span>
                <input
                  name="q"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, email, or phone"
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground"
                />
              </span>
            </label>

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

            <div className="grid grid-cols-[1fr_auto] gap-2 lg:col-span-2 xl:col-span-1">
              <Button
                type="submit"
                variant="default"
                size="lg"
                className="min-h-11 w-full px-4"
              >
                <Search />
                Search
              </Button>
              <Link
                href="/members"
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>

        {members.length > 0 ? (
          <>
            <div className="grid gap-3 xl:hidden">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  checkInDate={initialCheckInDate}
                />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-border bg-card text-card-foreground xl:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b border-border bg-muted/70 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="w-[25%] px-4 py-3 font-medium">Member</th>
                    <th className="w-[15%] px-4 py-3 font-medium">Plan</th>
                    <th className="w-[15%] px-4 py-3 font-medium">Health</th>
                    <th className="w-[11%] px-4 py-3 font-medium">Joined</th>
                    <th className="w-[13%] px-4 py-3 font-medium">Next bill</th>
                    <th className="w-[7%] px-4 py-3 font-medium">Visits</th>
                    <th className="w-[14%] px-4 py-3 font-medium">Actions</th>
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
          <div className="rounded-lg border border-border bg-card p-3">
            <EmptyState
              title={emptyState.title}
              detail={emptyState.detail}
              actionLabel={emptyState.canReset ? "Clear filters" : undefined}
              actionHref={emptyState.canReset ? "/members" : undefined}
            />
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-card-foreground">
      <p className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      {detail ? (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
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
    <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground uppercase">
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
    <article className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-[inset_0_1px_0_var(--color-shell-highlight)]">
      <div className="p-4">
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
            <div className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground">
              <p className="truncate">{member.email || "No email"}</p>
              <p className="truncate">{member.phone || "No phone"}</p>
            </div>
          </div>
          <StatusBadge status={member.status} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <RiskBadge risk={member.billingRisk} />
          <span className="rounded-lg border border-border bg-muted px-2 py-1 text-[0.7rem] font-medium text-muted-foreground uppercase">
            {formatMembershipStatus(member.membershipStatus)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <DetailField label="Plan" value={formatPlan(member)} truncate />
          <DetailField
            label="Next bill"
            value={member.nextBillingDateLabel}
            truncate
          />
          <DetailField label="Joined" value={member.joinDateLabel} truncate />
          <DetailField
            label="Visits"
            value={`${member.sessionsAttended}`}
            truncate
          />
        </div>
      </div>

      <div className="border-t border-border bg-muted/35 p-3">
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
    <tr className="transition-colors hover:bg-muted/35">
      <td className="px-4 py-4 align-top">
        <div className="min-w-0">
          <p className="truncate font-medium">
            <Link
              href={`/members/${member.id}`}
              className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {member.name}
            </Link>
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {member.email || "No email"}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {member.phone || "No phone"}
          </p>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="font-medium">{formatPlan(member)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatMembershipStatus(member.membershipStatus)}
        </p>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="grid gap-2">
          <StatusBadge status={member.status} />
          <RiskBadge risk={member.billingRisk} />
        </div>
      </td>
      <td className="px-4 py-4 align-top text-muted-foreground">
        {member.joinDateLabel}
      </td>
      <td className="px-4 py-4 align-top text-muted-foreground">
        {member.nextBillingDateLabel}
      </td>
      <td className="px-4 py-4 align-top font-semibold">
        {member.sessionsAttended}
      </td>
      <td className="px-4 py-4 align-top">
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
    <div
      className={cn(
        "grid grid-cols-2 gap-2 min-[420px]:grid-cols-4",
        "[&_[data-slot=button]]:w-full",
        compact && "grid-cols-1 min-[420px]:grid-cols-1"
      )}
    >
      <MemberQuickCheckInAction
        memberId={member.id}
        memberName={member.name}
        checkInDate={checkInDate}
      />
      <Button asChild variant="outline" size="sm" className="min-h-11 w-full">
        <Link href={`/members/${member.id}`}>View profile</Link>
      </Button>
      <Button asChild variant="outline" size="sm" className="min-h-11 w-full">
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
