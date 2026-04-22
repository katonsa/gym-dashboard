import type {
  MemberStatus,
  MembershipStatus,
  PaymentStatus,
} from "@/lib/domain/types"
import { titleCase } from "@/lib/dashboard/formatters"
import {
  membershipClasses,
  membershipDisplayClasses,
  paymentClasses,
  riskClasses,
  statusClasses,
  type BillingRisk,
} from "@/lib/dashboard/status-styles"
import type { MembershipDisplayStatus } from "@/lib/memberships/calculations"
import { cn } from "@/lib/utils"

const badgeClassName =
  "inline-flex w-fit items-center rounded-lg border px-2 py-1 text-[0.7rem] font-medium uppercase"

export function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span className={cn(badgeClassName, statusClasses[status])}>
      {titleCase(status)}
    </span>
  )
}

export function RiskBadge({ risk }: { risk: BillingRisk }) {
  return (
    <span className={cn(badgeClassName, riskClasses[risk])}>
      {risk === "clear" ? "No risk" : titleCase(risk)}
    </span>
  )
}

export function MembershipDisplayBadge({
  status,
}: {
  status: MembershipDisplayStatus
}) {
  return (
    <span className={cn(badgeClassName, membershipDisplayClasses[status])}>
      {status === "expiring" ? "Expiring soon" : titleCase(status)}
    </span>
  )
}

export function MembershipBadge({ status }: { status: MembershipStatus }) {
  return (
    <span className={cn(badgeClassName, membershipClasses[status])}>
      {titleCase(status)}
    </span>
  )
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn(badgeClassName, paymentClasses[status])}>
      {titleCase(status)}
    </span>
  )
}
