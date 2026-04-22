import { MembershipBadge } from "@/components/dashboard/badges"
import {
  formatBillingInterval,
  formatCurrency,
  formatDate,
} from "@/lib/dashboard/formatters"
import type { MemberDetailMembership } from "@/lib/dashboard/loaders"

export function MembershipHistoryItem({
  currencyCode,
  membership,
  timeZone,
}: {
  currencyCode: string
  membership: MemberDetailMembership
  timeZone: string
}) {
  return (
    <article className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">{membership.planTier.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatBillingInterval(membership.billingInterval)} |{" "}
            {formatCurrency(membership.priceAmount, currencyCode)}
          </p>
        </div>
        <MembershipBadge status={membership.status} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {formatDate(membership.startedAt, timeZone)} to{" "}
        {formatDate(membership.currentPeriodEndsAt, timeZone)}
      </p>
    </article>
  )
}
