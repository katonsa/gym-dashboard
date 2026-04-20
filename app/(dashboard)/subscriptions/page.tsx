import { EmptyState } from "@/components/dashboard/empty-state"
import { formatDashboardDate } from "@/lib/dashboard/formatters"
import { loadSubscriptionSummary } from "@/lib/dashboard/loaders"
import {
  PlanComparisonChart,
  type PlanComparisonChartRow,
  RevenueTrendChart,
} from "./subscription-charts"

const numberFormatter = new Intl.NumberFormat("en")
const percentFormatter = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
})

export default async function SubscriptionsPage() {
  const asOf = new Date()
  const subscriptionsData = await loadSubscriptionSummary(asOf)

  if (!subscriptionsData) {
    return (
      <EmptyState
        title="No gym is connected to this owner account."
        detail="Create or assign a gym for this owner before subscription data can appear."
      />
    )
  }

  const moneyFormatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: subscriptionsData.gym.currencyCode,
    maximumFractionDigits: 0,
  })
  const { subscriptionSummary } = subscriptionsData
  const { planBreakdown, revenueTrend, setupState } = subscriptionSummary
  const planChartData: PlanComparisonChartRow[] = planBreakdown.map((plan) => ({
    plan: plan.name,
    members: plan.memberCount,
    revenueMillions: plan.monthlyEquivalentRevenue / 1_000_000,
  }))
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
  const setupGaps = [
    !setupState.hasPlanTiers
      ? {
          title: "No plans configured.",
          detail: "Add plan tiers before plan mix and pricing can be compared.",
        }
      : null,
    !setupState.hasActiveRevenueMemberships
      ? {
          title: "No active memberships.",
          detail:
            "Active and past-due memberships will populate subscription revenue.",
        }
      : null,
    setupState.hasRevenueRecords
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
              <EmptyState
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
          <EmptyState
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
            <EmptyState
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
          {setupState.hasRevenueRecords ? (
            <RevenueTrendChart data={revenueTrend} />
          ) : (
            <EmptyState
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

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
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
