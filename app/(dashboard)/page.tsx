import { EmptyState } from "@/components/dashboard/empty-state"
import { SetupChecklist } from "@/components/dashboard/setup-checklist"
import {
  loadOverdueAgingSummary,
  loadOverviewAlerts,
  loadOverviewSummary,
  loadSetupChecklistData,
} from "@/lib/dashboard/loaders"
import { formatDashboardDate, formatCurrency, formatDateInput } from "@/lib/dashboard/formatters"
import { OverviewPinnedAlerts } from "./overview-pinned-alerts"
import { OverviewStatsSection } from "./overview-stats-section"

export default async function Page() {
  const asOf = new Date()
  const [overviewData, alerts, agingSummary, checklistData] =
    await Promise.all([
      loadOverviewSummary({ asOf }),
      loadOverviewAlerts({ asOf }),
      loadOverdueAgingSummary({ asOf }),
      loadSetupChecklistData(),
    ])

  if (!overviewData || !alerts) {
    return (
      <EmptyState
        title="No gym is connected to this owner account."
        detail="Create or assign a gym for this owner before dashboard data can appear."
        dashed
      />
    )
  }

  const { summary, setupState } = overviewData

  const moneyFormatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: summary.currencyCode,
    maximumFractionDigits: 0,
  })
  const numberFormatter = new Intl.NumberFormat("en")
  const asOfLabel = formatDashboardDate(asOf, overviewData.gym.timezone)
  const stats = [
    {
      label: "Total members",
      value: numberFormatter.format(summary.totalMembers),
      detail: `${summary.activeMembers} active, ${summary.inactiveMembers} inactive`,
      tone: "status",
    },
    {
      label: "New sign-ups",
      value: numberFormatter.format(summary.newSignUpsThisMonth),
      detail: "Joined this month",
      tone: "opportunity",
    },
    {
      label: "Membership MRR",
      value: moneyFormatter.format(summary.membershipMrrAmount),
      detail: "Monthly recurring revenue",
      tone: "revenue",
    },
    {
      label: "Drop-in revenue",
      value: moneyFormatter.format(summary.dropInRevenueThisMonthAmount),
      detail: "Collected this month",
      tone: "chart",
    },
    {
      label: "Total revenue",
      value: moneyFormatter.format(summary.totalRevenueThisMonthAmount),
      detail: "MRR plus drop-ins",
      tone: "revenue",
    },
    {
      label: "Expiring subs",
      value: numberFormatter.format(summary.expiringMembershipsCount),
      detail: "Inside renewal window",
      tone: "alert",
    },
    {
      label: "Expired subs",
      value: numberFormatter.format(summary.expiredMembershipsCount),
      detail: "Past current period",
      tone: "alert",
    },
  ]
  const alertSections = [
    {
      type: "OVERDUE_PAYMENT",
      label: "Overdue payments",
      count: summary.overduePaymentsCount,
      empty: "No overdue payments.",
    },
    {
      type: "EXPIRED_MEMBERSHIP",
      label: "Expired memberships",
      count: summary.expiredMembershipsCount,
      empty: "No memberships are past their current period.",
    },
    {
      type: "EXPIRING_MEMBERSHIP",
      label: "Expiring soon",
      count: summary.expiringMembershipsCount,
      empty: "No renewals inside the current window.",
    },
    {
      type: "INACTIVE_MEMBER",
      label: "Inactive members",
      count: summary.inactiveMembersCount,
      empty: "No inactive members are past the risk window.",
    },
    {
      type: "DROP_IN_CONVERSION",
      label: "Drop-in leads",
      count: summary.dropInConversionOpportunitiesCount,
      empty: "No frequent drop-ins have crossed the follow-up threshold.",
    },
  ] as const
  const openAlertsCount = alertSections.reduce(
    (total, section) => total + section.count,
    0
  )
  const setupGaps = [
    !setupState.hasPlanTiers
      ? {
          title: "No plan tiers yet.",
          detail: "Create a plan before assigning memberships.",
        }
      : null,
    !setupState.hasMembers
      ? {
          title: "No members yet.",
          detail:
            "Add member records to start tracking attendance and billing.",
        }
      : null,
    !setupState.hasMemberships
      ? {
          title: "No memberships yet.",
          detail: "Create memberships to populate MRR and renewal alerts.",
        }
      : null,
    !setupState.hasDropIns
      ? {
          title: "No drop-ins yet.",
          detail:
            "Log day-pass visits to track walk-in cash and follow-up leads.",
        }
      : null,
  ].filter((gap): gap is { title: string; detail: string } => Boolean(gap))

  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            {asOfLabel}
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
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Open alerts
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {numberFormatter.format(openAlertsCount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Billing, renewals, churn risk, and drop-in follow-up
          </p>
        </div>
      </section>

      {setupGaps.length > 0 && checklistData ? (
        <SetupChecklist
          setupState={setupState}
          currencyCode={summary.currencyCode}
          defaultDropInFeeAmount={overviewData.gym.defaultDropInFeeAmount}
          formattedDefaultAmount={formatCurrency(
            overviewData.gym.defaultDropInFeeAmount,
            summary.currencyCode
          )}
          planTiers={checklistData.planTiers}
          initialJoinDate={formatDateInput(asOf, overviewData.gym.timezone)}
          visitorLookupOptions={checklistData.visitorLookupOptions}
          nextSortOrder={checklistData.nextSortOrder}
        />
      ) : null}

      <OverviewPinnedAlerts
        alertSections={alertSections}
        alerts={alerts}
        currencyCode={summary.currencyCode}
        numberFormatter={numberFormatter}
        openAlertsCount={openAlertsCount}
      />

      <OverviewStatsSection
        stats={stats}
        hasActivity={
          summary.totalMembers > 0 || summary.dropInRevenueThisMonthAmount > 0
        }
      />

      <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
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
              <span className="text-muted-foreground">Expired</span>
              <span className="font-semibold">
                {summary.expiredMembershipsCount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <span className="text-muted-foreground">Overdue payments</span>
              <span className="font-semibold">
                {summary.overduePaymentsCount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Suspended members</span>
              <span className="font-semibold">{summary.suspendedMembers}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
          <h2 className="text-base font-semibold">Billing health</h2>
          {agingSummary && agingSummary.length > 0 ? (
            <div className="mt-4 grid gap-3 text-sm">
              {agingSummary.map((bucket) => (
                <div
                  key={bucket.bucket}
                  className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="text-muted-foreground">{bucket.bucket}</span>
                  <span className="font-semibold">
                    {bucket.count} · {moneyFormatter.format(bucket.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No overdue payments.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
