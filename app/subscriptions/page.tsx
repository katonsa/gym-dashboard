import {
  mockDashboardAsOf,
  mockDashboardData,
  type BillingInterval,
  type DashboardData,
  type Membership,
} from "@/lib/dashboard"
import {
  PlanComparisonChart,
  type PlanComparisonChartRow,
  RevenueTrendChart,
  type RevenueTrendChartRow,
} from "./subscription-charts"

const asOf = new Date(mockDashboardAsOf)
const activeRevenueStatuses = new Set<Membership["status"]>([
  "ACTIVE",
  "PAST_DUE",
])

const moneyFormatter = new Intl.NumberFormat("en", {
  style: "currency",
  currency: mockDashboardData.gym.currencyCode,
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("en")
const percentFormatter = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
})

const planBreakdown = getPlanBreakdown(mockDashboardData)
const planChartData: PlanComparisonChartRow[] = planBreakdown.map((plan) => ({
  plan: plan.name,
  members: plan.memberCount,
  revenueMillions: plan.monthlyEquivalentRevenue / 1_000_000,
}))
const revenueTrend = getRevenueTrend(mockDashboardData, asOf)
const latestRevenue = revenueTrend.at(-1)
const previousRevenue = revenueTrend.at(-2)
const monthOverMonthAmount = latestRevenue && previousRevenue
  ? latestRevenue.total - previousRevenue.total
  : 0
const monthOverMonthPercent =
  previousRevenue && previousRevenue.total > 0
    ? monthOverMonthAmount / previousRevenue.total
    : 0

export default function SubscriptionsPage() {
  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            Thursday, Apr 16
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
            Subscriptions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Plan mix, billing intervals, and revenue movement by tier.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Month movement
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatSignedMoney(monthOverMonthAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatSignedPercent(monthOverMonthPercent)} from prior month
          </p>
        </div>
      </section>

      <section aria-labelledby="plan-breakdown" className="grid gap-3">
        <div>
          <h2 id="plan-breakdown" className="text-base font-semibold">
            Subscription breakdown
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Active and past-due memberships, normalized to monthly revenue.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {planBreakdown.map((plan) => (
            <article
              key={plan.id}
              className="rounded-lg border border-border bg-card p-4 text-card-foreground"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                <span className="rounded-lg bg-primary/12 px-2 py-1 text-xs font-medium text-primary">
                  {numberFormatter.format(plan.memberCount)}
                </span>
              </div>
              <dl className="mt-5 grid gap-3 text-sm">
                <PlanMetric
                  label="Monthly revenue"
                  value={moneyFormatter.format(plan.monthlyEquivalentRevenue)}
                />
                <PlanMetric
                  label="Member share"
                  value={percentFormatter.format(plan.memberShare)}
                />
                <PlanMetric
                  label="Monthly billing"
                  value={`${plan.monthlyMemberships} members`}
                />
                <PlanMetric
                  label="Annual billing"
                  value={`${plan.annualMemberships} members`}
                />
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-4 text-card-foreground">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Plan comparison</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Members and monthly-equivalent revenue in millions.
            </p>
          </div>
          <PlanComparisonChart data={planChartData} />
        </article>

        <article className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-4 text-card-foreground">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Revenue trend</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Membership, drop-in, and total revenue for six months.
            </p>
          </div>
          <RevenueTrendChart data={revenueTrend} />
        </article>
      </section>

      <section
        aria-labelledby="revenue-detail"
        className="rounded-lg border border-border bg-card p-4 text-card-foreground"
      >
        <h2 id="revenue-detail" className="text-base font-semibold">
          Six-month revenue
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {revenueTrend.map((month) => (
            <article
              key={month.month}
              className="min-h-32 rounded-lg border border-border bg-background p-3"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {month.month}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {moneyFormatter.format(month.total)}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {moneyFormatter.format(month.membership)} recurring
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {moneyFormatter.format(month.dropIns)} drop-ins
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}

function getPlanBreakdown(data: DashboardData) {
  const totalRevenueMemberships = data.memberships.filter((membership) =>
    activeRevenueStatuses.has(membership.status)
  ).length

  return data.planTiers
    .toSorted((left, right) => left.sortOrder - right.sortOrder)
    .map((plan) => {
      const memberships = data.memberships.filter(
        (membership) =>
          membership.planTierId === plan.id &&
          activeRevenueStatuses.has(membership.status)
      )

      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        memberCount: memberships.length,
        memberShare:
          totalRevenueMemberships > 0
            ? memberships.length / totalRevenueMemberships
            : 0,
        monthlyMemberships: countBillingInterval(memberships, "MONTHLY"),
        annualMemberships: countBillingInterval(memberships, "ANNUAL"),
        monthlyEquivalentRevenue: memberships.reduce(
          (total, membership) =>
            total + getMonthlyEquivalentRevenue(membership),
          0
        ),
      }
    })
}

function getRevenueTrend(
  data: DashboardData,
  currentMonth: Date
): RevenueTrendChartRow[] {
  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(
      Date.UTC(
        currentMonth.getUTCFullYear(),
        currentMonth.getUTCMonth() - (5 - index),
        1
      )
    )
    const monthStart = month.getTime()
    const monthEnd = new Date(
      Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0, 23, 59, 59)
    ).getTime()
    const membership = data.memberships.reduce((total, membership) => {
      if (!wasMembershipLiveDuringMonth(membership, monthStart, monthEnd)) {
        return total
      }

      return total + getMonthlyEquivalentRevenue(membership)
    }, 0)
    const dropIns = data.dropIns.reduce((total, dropIn) => {
      return isSameChartMonth(dropIn.visitedAt, month)
        ? total + dropIn.amount
        : total
    }, 0)

    return {
      month: new Intl.DateTimeFormat("en", { month: "short" }).format(month),
      membership,
      dropIns,
      total: membership + dropIns,
    }
  })
}

function countBillingInterval(
  memberships: Membership[],
  billingInterval: BillingInterval
) {
  return memberships.filter(
    (membership) => membership.billingInterval === billingInterval
  ).length
}

function getMonthlyEquivalentRevenue(membership: Membership) {
  return membership.billingInterval === "ANNUAL"
    ? membership.priceAmount / 12
    : membership.priceAmount
}

function wasMembershipLiveDuringMonth(
  membership: Membership,
  monthStart: number,
  monthEnd: number
) {
  const startedAt = new Date(membership.startedAt).getTime()
  const endedAt = membership.canceledAt
    ? new Date(membership.canceledAt).getTime()
    : new Date(membership.currentPeriodEndsAt).getTime()

  return startedAt <= monthEnd && endedAt >= monthStart
}

function isSameChartMonth(date: string, month: Date) {
  const value = new Date(date)

  return (
    value.getUTCFullYear() === month.getUTCFullYear() &&
    value.getUTCMonth() === month.getUTCMonth()
  )
}

function formatSignedMoney(amount: number) {
  const sign = amount > 0 ? "+" : ""

  return `${sign}${moneyFormatter.format(amount)}`
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : ""

  return `${sign}${percentFormatter.format(value)}`
}
