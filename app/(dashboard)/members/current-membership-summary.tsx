import Link from "next/link"

import { MembershipDisplayBadge } from "@/components/dashboard/badges"
import { DetailField } from "@/components/dashboard/detail-field"
import { Button } from "@/components/ui/button"
import {
  formatBillingInterval,
  formatCurrency,
  formatDate,
  formatDateInput,
  getDaysBetween,
  getExpiringMembershipPeriodText,
  getMembershipDisplayStatus,
} from "@/lib/dashboard"
import type { MembershipDisplayStatus } from "@/lib/dashboard/calculations"
import type { MemberDetailMembership } from "@/lib/dashboard/loaders"
import { MemberRenewalAction } from "./member-renewal-action"

export function CurrentMembershipSummary({
  currencyCode,
  membership,
  asOf,
  timeZone,
}: {
  currencyCode: string
  membership: MemberDetailMembership
  asOf: Date
  timeZone: string
}) {
  const displayStatus = getMembershipDisplayStatus(membership, asOf)
  const periodDetail = getMembershipPeriodDetail(
    membership,
    displayStatus,
    asOf
  )
  const canRenew =
    (displayStatus === "expiring" || displayStatus === "expired") &&
    (membership.status === "ACTIVE" || membership.status === "EXPIRED")

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-lg font-semibold">{membership.planTier.name}</p>
        <MembershipDisplayBadge status={displayStatus} />
      </div>
      {periodDetail ? (
        <p className="text-sm font-medium text-muted-foreground">
          {periodDetail}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField
          label="Interval"
          value={formatBillingInterval(membership.billingInterval)}
        />
        <DetailField
          label="Price"
          value={formatCurrency(membership.priceAmount, currencyCode)}
        />
        <DetailField
          label="Period ends"
          value={formatDate(membership.currentPeriodEndsAt, timeZone)}
        />
        <DetailField
          label="Next billing"
          value={formatDate(membership.nextBillingDate, timeZone)}
        />
      </div>
      <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-start">
        <MemberRenewalAction
          membershipId={membership.id}
          expectedStatus={
            membership.status === "EXPIRED" ? "EXPIRED" : "ACTIVE"
          }
          expectedCurrentPeriodEndsAt={membership.currentPeriodEndsAt}
          canRenew={canRenew}
          displayStatus={displayStatus}
          planName={membership.planTier.name}
          billingInterval={membership.billingInterval}
          formattedAmount={formatCurrency(membership.priceAmount, currencyCode)}
          defaultRenewalDate={formatDateInput(new Date(), timeZone)}
          asOf={asOf.toISOString()}
          timeZone={timeZone}
        />
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
        >
          <Link href="#plan-change">Edit plan</Link>
        </Button>
      </div>
    </div>
  )
}

function getMembershipPeriodDetail(
  membership: MemberDetailMembership,
  displayStatus: MembershipDisplayStatus,
  asOf: Date
) {
  if (displayStatus === "expiring") {
    const daysRemaining = Math.max(
      0,
      getDaysBetween(asOf, membership.currentPeriodEndsAt)
    )

    return getExpiringMembershipPeriodText(daysRemaining)
  }

  if (displayStatus === "expired") {
    const daysOverdue = Math.max(
      1,
      getDaysBetween(membership.currentPeriodEndsAt, asOf)
    )

    return daysOverdue === 1
      ? "Expired 1 day ago."
      : `Expired ${daysOverdue} days ago.`
  }

  return null
}
