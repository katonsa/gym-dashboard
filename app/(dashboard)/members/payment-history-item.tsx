import { PaymentBadge } from "@/components/dashboard/badges"
import {
  formatCurrency,
  formatDate,
  type MembershipPayment,
} from "@/lib/dashboard"
import { PaymentActions } from "./payment-actions"

export function PaymentHistoryItem({
  currencyCode,
  payment,
  timeZone,
}: {
  currencyCode: string
  payment: MembershipPayment
  timeZone: string
}) {
  const formattedAmount = formatCurrency(payment.amount, currencyCode)
  const isActionable =
    payment.status === "PENDING" || payment.status === "OVERDUE"

  return (
    <article className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">{formattedAmount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Due {formatDate(payment.dueAt, timeZone)}
          </p>
        </div>
        <PaymentBadge status={payment.status} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Paid{" "}
        {payment.paidAt ? formatDate(payment.paidAt, timeZone) : "not recorded"}
      </p>
      {isActionable ? (
        <div className="mt-3 border-t border-border pt-3">
          <PaymentActions
            paymentId={payment.id}
            paymentStatus={payment.status}
            formattedAmount={formattedAmount}
          />
        </div>
      ) : null}
    </article>
  )
}
