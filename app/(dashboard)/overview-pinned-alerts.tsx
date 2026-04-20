import Link from "next/link"

import { EmptyState } from "@/components/dashboard/empty-state"
import type { DashboardAlert } from "@/lib/dashboard"
import { formatCurrency } from "@/lib/dashboard/formatters"
import { severityClasses } from "@/lib/dashboard/status-styles"
import { OverviewMarkPaidAction } from "./overview-mark-paid-action"
import { OverviewRenewalAction } from "./overview-renewal-action"

export type OverviewAlertSection = {
  type: DashboardAlert["type"]
  label: string
  count: number
  empty: string
}

export function OverviewPinnedAlerts({
  alertSections,
  alerts,
  currencyCode,
  numberFormatter,
  openAlertsCount,
}: {
  alertSections: readonly OverviewAlertSection[]
  alerts: DashboardAlert[]
  currencyCode: string
  numberFormatter: Intl.NumberFormat
  openAlertsCount: number
}) {
  const getAlertsByType = (type: DashboardAlert["type"]) =>
    alerts.filter((alert) => alert.type === type)

  return (
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
                currencyCode={currencyCode}
                empty={section.empty}
                label={section.label}
                renderedCount={sectionAlerts.length}
                numberFormatter={numberFormatter}
              />
            )
          })}
        </div>
      ) : (
        <EmptyState
          title="No open alerts."
          detail="Renewals, payment risks, stale attendance, and drop-in follow-ups will appear here."
          dashed
        />
      )}
    </section>
  )
}

function PinnedAlertCard({
  alert,
  capped,
  count,
  currencyCode,
  empty,
  label,
  renderedCount,
  numberFormatter,
}: {
  alert?: DashboardAlert
  capped: boolean
  count: number
  currencyCode: string
  empty: string
  label: string
  renderedCount: number
  numberFormatter: Intl.NumberFormat
}) {
  const href = getAlertHref(alert)
  const isCardLink =
    href &&
    (alert?.type === "EXPIRING_MEMBERSHIP" ||
      alert?.type === "EXPIRED_MEMBERSHIP" ||
      alert?.type === "OVERDUE_PAYMENT")
  const renewalAction =
    isCardLink && alert?.membershipId && alert.membershipStatus && alert.dueAt
      ? {
          membershipId: alert.membershipId,
          expectedStatus: alert.membershipStatus,
          expectedCurrentPeriodEndsAt: alert.dueAt,
        }
      : null
  const markPaidAction =
    alert?.type === "OVERDUE_PAYMENT" && alert.paymentId
      ? {
          paymentId: alert.paymentId,
          formattedAmount: formatCurrency(
            alert.paymentAmount ?? 0,
            currencyCode
          ),
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
      {markPaidAction ? (
        <OverviewMarkPaidAction
          paymentId={markPaidAction.paymentId}
          formattedAmount={markPaidAction.formattedAmount}
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
