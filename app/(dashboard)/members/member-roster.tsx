"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import type {
  BillingInterval,
  MemberStatus,
  MembershipStatus,
  PlanTierName,
} from "@/lib/dashboard"
import { cn } from "@/lib/utils"

type BillingRisk = "clear" | "expiring" | "overdue"
type StatusFilter = "all" | MemberStatus
type PlanFilter = "all" | PlanTierName
type RiskFilter = "all" | BillingRisk

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

const statusOptions: StatusFilter[] = ["all", "ACTIVE", "INACTIVE", "SUSPENDED"]
const planOptions: PlanFilter[] = ["all", "Basic", "Pro", "Elite"]
const riskOptions: RiskFilter[] = ["all", "overdue", "expiring", "clear"]

const statusClasses: Record<MemberStatus, string> = {
  ACTIVE: "border-status/45 bg-status/12 text-status",
  INACTIVE: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  SUSPENDED: "border-alert/45 bg-alert/12 text-alert",
}

const riskClasses: Record<BillingRisk, string> = {
  clear: "border-border bg-muted text-muted-foreground",
  expiring: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  overdue: "border-alert/45 bg-alert/12 text-alert",
}

export function MemberRoster({
  members,
  asOfLabel,
}: {
  members: MemberRosterRow[]
  asOfLabel: string
}) {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [plan, setPlan] = React.useState<PlanFilter>("all")
  const [risk, setRisk] = React.useState<RiskFilter>("all")
  const [actionMessage, setActionMessage] = React.useState("")

  const filteredMembers = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return members.filter((member) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        member.name.toLowerCase().includes(normalizedQuery) ||
        member.email.toLowerCase().includes(normalizedQuery) ||
        member.phone.toLowerCase().includes(normalizedQuery)
      const matchesStatus = status === "all" || member.status === status
      const matchesPlan = plan === "all" || member.planName === plan
      const matchesRisk = risk === "all" || member.billingRisk === risk

      return matchesQuery && matchesStatus && matchesPlan && matchesRisk
    })
  }, [members, plan, query, risk, status])

  const resetFilters = React.useCallback(() => {
    setQuery("")
    setStatus("all")
    setPlan("all")
    setRisk("all")
  }, [])

  const handlePlaceholderAction = React.useCallback(
    (action: string, memberName: string) => {
      setActionMessage(
        `${action} for ${memberName} is ready for the mutation flow.`
      )
    },
    []
  )

  const activeFiltersCount = [
    query.trim().length > 0,
    status !== "all",
    plan !== "all",
    risk !== "all",
  ].filter(Boolean).length

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
            {filteredMembers.length} of {members.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeFiltersCount} active filters
          </p>
        </div>
      </section>

      <section
        aria-labelledby="member-filters"
        className="rounded-lg border border-border bg-card p-3 text-card-foreground sm:p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <h2 id="member-filters" className="text-sm font-semibold">
              Find a member
            </h2>
            <label className="mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm focus-within:ring-3 focus-within:ring-ring/40">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Search by name, email, or phone</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, email, or phone"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>

          <FilterSelect
            label="Status"
            value={status}
            options={statusOptions}
            formatOption={formatStatusFilter}
            onChange={(value) => setStatus(value as StatusFilter)}
          />
          <FilterSelect
            label="Plan"
            value={plan}
            options={planOptions}
            formatOption={formatPlanFilter}
            onChange={(value) => setPlan(value as PlanFilter)}
          />
          <FilterSelect
            label="Billing risk"
            value={risk}
            options={riskOptions}
            formatOption={formatRiskFilter}
            onChange={(value) => setRisk(value as RiskFilter)}
          />

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11"
            onClick={resetFilters}
          >
            Reset
          </Button>
        </div>
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
          <p
            aria-live="polite"
            className="min-h-5 text-xs text-muted-foreground"
          >
            {actionMessage}
          </p>
        </div>

        {filteredMembers.length > 0 ? (
          <>
            <div className="grid gap-3 md:hidden">
              {filteredMembers.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onPlaceholderAction={handlePlaceholderAction}
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
                  {filteredMembers.map((member) => (
                    <MemberTableRow
                      key={member.id}
                      member={member}
                      onPlaceholderAction={handlePlaceholderAction}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-border bg-card p-5 text-card-foreground">
            <p className="text-sm font-medium">
              No members match these filters.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Clear a filter or search a different name, email, or phone.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  formatOption,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  formatOption: (value: string) => string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid min-w-40 gap-1 text-xs font-medium text-muted-foreground uppercase">
      {label}
      <select
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
  onPlaceholderAction,
}: {
  member: MemberRosterRow
  onPlaceholderAction: (action: string, memberName: string) => void
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{member.name}</h3>
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
        <QuickActions
          member={member}
          onPlaceholderAction={onPlaceholderAction}
        />
      </div>
    </article>
  )
}

function MemberTableRow({
  member,
  onPlaceholderAction,
}: {
  member: MemberRosterRow
  onPlaceholderAction: (action: string, memberName: string) => void
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
        <QuickActions
          member={member}
          onPlaceholderAction={onPlaceholderAction}
          compact
        />
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
  onPlaceholderAction,
  compact = false,
}: {
  member: MemberRosterRow
  onPlaceholderAction: (action: string, memberName: string) => void
  compact?: boolean
}) {
  const actions = ["View profile", "Edit plan", "Suspend account"]

  return (
    <div className={cn("flex flex-wrap gap-2", compact && "grid")}>
      {actions.map((action) => (
        <Button
          key={action}
          type="button"
          variant={action === "Suspend account" ? "destructive" : "outline"}
          size="sm"
          className="min-h-11"
          onClick={() => onPlaceholderAction(action, member.name)}
        >
          {action}
        </Button>
      ))}
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

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
