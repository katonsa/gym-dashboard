import { type BillingInterval, type Membership } from "@/lib/dashboard"
import {
  loadSubscriptionsDashboardData,
  type SubscriptionsDashboardData,
} from "@/lib/dashboard/loaders"
import {
  PlanComparisonChart,
  type PlanComparisonChartRow,
  RevenueTrendChart,
  type RevenueTrendChartRow,
} from "./subscription-charts"

const activeRevenueStatuses = new Set<Membership["status"]>([
  "ACTIVE",
  "PAST_DUE",
])

const numberFormatter = new Intl.NumberFormat("en")
const percentFormatter = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
})

export default async function SubscriptionsPage() {
  const subscriptionsData = await loadSubscriptionsDashboardData()

  if (!subscriptionsData) {
    return (
      <SubscriptionEmptyState
        title="No gym is connected to this owner account."
        detail="Create or assign a gym for this owner before subscription data can appear."
      />
    )
  }

  const asOf = new Date()
  const moneyFormatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: subscriptionsData.gym.currencyCode,
    maximumFractionDigits: 0,
  })
  const planBreakdown = getPlanBreakdown(subscriptionsData)
  const planChartData: PlanComparisonChartRow[] = planBreakdown.map((plan) => ({
    plan: plan.name,
    members: plan.memberCount,
    revenueMillions: plan.monthlyEquivalentRevenue / 1_000_000,
  }))
  const revenueTrend = getRevenueTrend(subscriptionsData, asOf)
  const latestRevenue = revenueTrend.at(-1)
  const previousRevenue = revenueTrend.at(-2)
  const monthOverMonthAmount =
    latestRevenue && previousRevenue
      ? latestRevenue.total - previousRevenue.total
      : 0
  const monthOverMonthPercent =
    previousRevenue && previousRevenue.total > 0
      ? monthOverMonthAmount / previousRevenue.total
      : 0
  const activeRevenueMemberships = subscriptionsData.memberships.filter(
    (membership) => activeRevenueStatuses.has(membership.status)
  )
  const setupGaps = [
    subscriptionsData.planTiers.length === 0
      ? {
          title: "No plans configured.",
          detail: "Add plan tiers before plan mix and pricing can be compared.",
        }
      : null,
    activeRevenueMemberships.length === 0
      ? {
          title: "No active memberships.",
          detail:
            "Active and past-due memberships will populate subscription revenue.",
        }
      : null,
    hasRevenueRecords(subscriptionsData)
      ? null
      : {
          title: "No revenue records.",
          detail:
            "Membership billing and drop-in revenue will appear once records are created.",
        },
  ].filter((gap): gap is { title: string; detail: string } => Boolean(gap))

  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            {formatDashboardDate(asOf, subscriptionsData.gym.timezone)}
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
            {formatSignedMoney(monthOverMonthAmount, moneyFormatter)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatSignedPercent(monthOverMonthPercent)} from prior month
          </p>
        </div>
      </section>

      {setupGaps.length > 0 ? (
        <section aria-labelledby="subscription-setup" className="grid gap-3">
          <div>
            <h2 id="subscription-setup" className="text-base font-semibold">
              Setup status
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete these records to fill the subscription view.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {setupGaps.map((gap) => (
              <SubscriptionEmptyState
                key={gap.title}
                title={gap.title}
                detail={gap.detail}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="plan-breakdown" className="grid gap-3">
        <div>
          <h2 id="plan-breakdown" className="text-base font-semibold">
            Subscription breakdown
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Active and past-due memberships, normalized to monthly revenue.
          </p>
        </div>
        {planBreakdown.length > 0 ? (
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
        ) : (
          <SubscriptionEmptyState
            title="No plans configured."
            detail="Plan tiers will appear here after they are added to this gym."
          />
        )}
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-4 text-card-foreground">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Plan comparison</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Members and monthly-equivalent revenue in millions.
            </p>
          </div>
          {planChartData.length > 0 ? (
            <PlanComparisonChart data={planChartData} />
          ) : (
            <SubscriptionEmptyState
              title="No plans configured."
              detail="Plan comparison starts after plan tiers are added."
            />
          )}
        </article>

        <article className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-4 text-card-foreground">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Revenue trend</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Membership, drop-in, and total revenue for six months.
            </p>
          </div>
          {hasRevenueRecords(subscriptionsData) ? (
            <RevenueTrendChart data={revenueTrend} />
          ) : (
            <SubscriptionEmptyState
              title="No revenue records."
              detail="The six-month trend will start at zero until billing or drop-in records exist."
            />
          )}
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

function SubscriptionEmptyState({
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

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}

function getPlanBreakdown(data: SubscriptionsDashboardData) {
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
  data: SubscriptionsDashboardData,
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

function hasRevenueRecords(data: SubscriptionsDashboardData) {
  return (
    data.memberships.length > 0 ||
    data.dropIns.length > 0 ||
    data.payments.length > 0
  )
}

function formatSignedMoney(amount: number, formatter: Intl.NumberFormat) {
  const sign = amount > 0 ? "+" : ""

  return `${sign}${formatter.format(amount)}`
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : ""

  return `${sign}${percentFormatter.format(value)}`
}

function formatDashboardDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date)
}
