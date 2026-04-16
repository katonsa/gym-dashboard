import {
  getDashboardAlerts,
  getDashboardSummary,
  mockDashboardAsOf,
  mockDashboardData,
} from "@/lib/dashboard"

const asOf = new Date(mockDashboardAsOf)
const summary = getDashboardSummary(mockDashboardData, { asOf })
const alerts = getDashboardAlerts(mockDashboardData, { asOf }).slice(0, 4)

const moneyFormatter = new Intl.NumberFormat("en", {
  style: "currency",
  currency: summary.currencyCode,
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("en")

const metrics = [
  {
    label: "Active members",
    value: numberFormatter.format(summary.activeMembers),
    detail: `${summary.inactiveMembers} inactive, ${summary.suspendedMembers} suspended`,
    tone: "status",
  },
  {
    label: "Membership MRR",
    value: moneyFormatter.format(summary.membershipMrrAmount),
    detail: "Monthly equivalent recurring revenue",
    tone: "revenue",
  },
  {
    label: "Drop-in revenue",
    value: moneyFormatter.format(summary.dropInRevenueThisMonthAmount),
    detail: "Current month visits",
    tone: "chart",
  },
  {
    label: "Open alerts",
    value: numberFormatter.format(alerts.length),
    detail: `${summary.overduePaymentsCount} billing, ${summary.expiringMembershipsCount} renewal`,
    tone: "alert",
  },
]

const toneClasses: Record<string, string> = {
  alert: "bg-alert",
  chart: "bg-chart-1",
  revenue: "bg-revenue",
  status: "bg-status",
}

export default function Page() {
  return (
    <div className="grid gap-5">
      <section className="grid gap-3 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-primary">
            Thursday, Apr 16
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
            Today&apos;s gym floor
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Renewals, overdue payments, member activity, and drop-in cash are in
            one working view.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Total revenue
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {moneyFormatter.format(summary.totalRevenueThisMonthAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.newSignUpsThisMonth} new sign-ups this month
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="min-h-32 rounded-lg border border-border bg-card p-3 text-card-foreground sm:p-4"
          >
            <div
              className={`mb-3 h-1.5 w-14 rounded-full ${
                toneClasses[metric.tone]
              }`}
            />
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-2 break-words text-xl font-semibold sm:text-2xl">
              {metric.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {metric.detail}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Priority queue</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Work the highest-risk accounts first.
              </p>
            </div>
            <span className="rounded-lg bg-alert/12 px-2 py-1 text-xs font-medium text-alert">
              Live mock data
            </span>
          </div>
          <div className="grid gap-2">
            {alerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-lg border border-border bg-background px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {alert.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {alert.detail}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-border px-2 py-1 text-[0.7rem] font-medium uppercase text-muted-foreground">
                    {alert.severity}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
          <h2 className="text-base font-semibold">Operating mix</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <span className="text-muted-foreground">Total members</span>
              <span className="font-semibold">{summary.totalMembers}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <span className="text-muted-foreground">Expiring soon</span>
              <span className="font-semibold">
                {summary.expiringMembershipsCount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <span className="text-muted-foreground">Overdue payments</span>
              <span className="font-semibold">
                {summary.overduePaymentsCount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Drop-in leads</span>
              <span className="font-semibold">
                {summary.dropInConversionOpportunitiesCount}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
