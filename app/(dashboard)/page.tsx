import Link from "next/link"

import {
  loadOverdueAgingSummary,
  loadOverviewAlerts,
  loadOverviewSummary,
} from "@/lib/dashboard/loaders"
import type { DashboardAlert, DashboardAlertSeverity } from "@/lib/dashboard"
import { OverviewRenewalAction } from "./overview-renewal-action"

const toneClasses: Record<string, string> = {
  alert: "bg-alert",
  chart: "bg-chart-1",
  opportunity: "bg-opportunity",
  revenue: "bg-revenue",
  status: "bg-status",
}

const severityClasses: Record<DashboardAlertSeverity, string> = {
  critical: "border-alert/45 bg-alert/12 text-alert",
  warning: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  opportunity: "border-opportunity/45 bg-opportunity/12 text-opportunity",
  info: "border-chart-1/45 bg-chart-1/12 text-chart-1",
}

export default async function Page() {
  const asOf = new Date()
  const [overviewData, alerts, agingSummary] = await Promise.all([
    loadOverviewSummary({ asOf }),
    loadOverviewAlerts({ asOf }),
    loadOverdueAgingSummary({ asOf }),
  ])

  if (!overviewData || !alerts) {
    return (
      <OverviewEmptyState
        title="No gym is connected to this owner account."
        detail="Create or assign a gym for this owner before dashboard data can appear."
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
  const getAlertsByType = (type: DashboardAlert["type"]) =>
    alerts.filter((alert) => alert.type === type)
  const setupGaps = [
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

      <section aria-labelledby="pinned-alerts" className="grid gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="pinned-alerts" className="text-base font-semibold">
              Pinned alerts
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Work the highest-risk accounts first.
            </p>
          </div>
          <span className="rounded-lg bg-alert/12 px-2 py-1 text-xs font-medium text-alert">
            Database records
          </span>
        </div>

        {openAlertsCount > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {alertSections.map((section) => {
              const sectionAlerts = getAlertsByType(section.type)
              const firstAlert = sectionAlerts[0]
              const capped =
                section.count > 0 && sectionAlerts.length < section.count

              return (
                <PinnedAlertCard
                  key={section.type}
                  alert={firstAlert}
                  capped={capped}
                  count={section.count}
                  empty={section.empty}
                  label={section.label}
                  renderedCount={sectionAlerts.length}
                  numberFormatter={numberFormatter}
                />
              )
            })}
          </div>
        ) : (
          <OverviewEmptyState
            title="No open alerts."
            detail="Renewals, payment risks, stale attendance, and drop-in follow-ups will appear here."
          />
        )}
      </section>

      <section aria-labelledby="overview-stats" className="grid gap-3">
        <div>
          <h2 id="overview-stats" className="text-base font-semibold">
            Overview stats
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Current membership and revenue snapshot.
          </p>
        </div>
        {summary.totalMembers > 0 ||
        summary.dropInRevenueThisMonthAmount > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="min-h-36 rounded-lg border border-border bg-card p-3 text-card-foreground sm:p-4"
              >
                <div
                  className={`mb-3 h-1.5 w-14 rounded-full ${
                    toneClasses[stat.tone]
                  }`}
                />
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {stat.label}
                </p>
                <p className="mt-2 text-lg leading-7 font-semibold break-words sm:text-xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <OverviewEmptyState
            title="No dashboard activity yet."
            detail="Add members, memberships, or drop-ins to populate the overview."
          />
        )}
      </section>

      {setupGaps.length > 0 ? (
        <section aria-labelledby="setup-gaps" className="grid gap-3">
          <div>
            <h2 id="setup-gaps" className="text-base font-semibold">
              Setup gaps
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete these records to fill the dashboard.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {setupGaps.map((gap) => (
              <OverviewEmptyState
                key={gap.title}
                title={gap.title}
                detail={gap.detail}
              />
            ))}
          </div>
        </section>
      ) : null}

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

function PinnedAlertCard({
  alert,
  capped,
  count,
  empty,
  label,
  renderedCount,
  numberFormatter,
}: {
  alert?: DashboardAlert
  capped: boolean
  count: number
  empty: string
  label: string
  renderedCount: number
  numberFormatter: Intl.NumberFormat
}) {
  const href = getAlertHref(alert)
  const isCardLink =
    href &&
    (alert?.type === "EXPIRING_MEMBERSHIP" ||
      alert?.type === "EXPIRED_MEMBERSHIP")
  const renewalAction =
    isCardLink && alert?.membershipId && alert.membershipStatus && alert.dueAt
      ? {
          membershipId: alert.membershipId,
          expectedStatus: alert.membershipStatus,
          expectedCurrentPeriodEndsAt: alert.dueAt,
        }
      : null
  const className =
    "relative min-h-36 rounded-lg border border-border bg-card p-3 text-card-foreground transition-colors sm:p-4"
  const interactiveClassName = isCardLink
    ? `${className} hover:border-primary/45 hover:bg-muted/40`
    : className
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {numberFormatter.format(count)}
          </p>
        </div>
        {alert ? (
          <span
            className={`shrink-0 rounded-lg border px-2 py-1 text-[0.7rem] font-medium uppercase ${severityClasses[alert.severity]}`}
          >
            {alert.severity}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-5 font-medium">
        {alert ? (
          href && !isCardLink ? (
            <Link
              href={href}
              className="underline underline-offset-3 hover:text-foreground"
            >
              {alert.title}
            </Link>
          ) : (
            alert.title
          )
        ) : (
          empty
        )}
      </p>
      {alert ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {alert.detail}
        </p>
      ) : null}
      {capped ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Showing {numberFormatter.format(renderedCount)} of{" "}
          {numberFormatter.format(count)}.
        </p>
      ) : null}
      {renewalAction ? (
        <OverviewRenewalAction
          membershipId={renewalAction.membershipId}
          expectedStatus={renewalAction.expectedStatus}
          expectedCurrentPeriodEndsAt={
            renewalAction.expectedCurrentPeriodEndsAt
          }
        />
      ) : null}
    </>
  )

  if (isCardLink) {
    return (
      <article className={interactiveClassName}>
        <Link
          href={href}
          aria-label={`Open ${alert.title}`}
          className="absolute inset-0 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
        {content}
      </article>
    )
  }

  return <article className={interactiveClassName}>{content}</article>
}

function getAlertHref(alert?: DashboardAlert) {
  if (!alert?.memberId) {
    return null
  }

  if (
    alert.type === "EXPIRING_MEMBERSHIP" ||
    alert.type === "EXPIRED_MEMBERSHIP"
  ) {
    return `/members/${alert.memberId}#current-membership`
  }

  if (alert.type === "OVERDUE_PAYMENT") {
    return `/members/${alert.memberId}#payments`
  }

  return `/members/${alert.memberId}`
}

function OverviewEmptyState({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  return (
    <article className="rounded-lg border border-dashed border-border bg-card p-4 text-card-foreground">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  )
}

function formatDashboardDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date)
}
