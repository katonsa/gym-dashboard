import type {
  DashboardAlertSeverity,
  MemberStatus,
  MembershipStatus,
  PaymentStatus,
} from "@/lib/dashboard/types"
import type { MembershipDisplayStatus } from "@/lib/dashboard/calculations"

export type BillingRisk = "clear" | "expired" | "expiring" | "overdue"

export const statusClasses: Record<MemberStatus, string> = {
  ACTIVE: "border-status/45 bg-status/12 text-status",
  INACTIVE: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  SUSPENDED: "border-alert/45 bg-alert/12 text-alert",
}

export const riskClasses: Record<BillingRisk, string> = {
  clear: "border-border bg-muted text-muted-foreground",
  expired: "border-alert/45 bg-alert/12 text-alert",
  expiring: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  overdue: "border-alert/45 bg-alert/12 text-alert",
}

export const membershipDisplayClasses: Record<MembershipDisplayStatus, string> =
  {
    active: "border-status/45 bg-status/12 text-status",
    canceled: "border-muted-foreground/35 bg-muted text-muted-foreground",
    expired: "border-alert/45 bg-alert/12 text-alert",
    expiring: "border-chart-3/45 bg-chart-3/12 text-chart-3",
    past_due: "border-alert/45 bg-alert/12 text-alert",
  }

export const membershipClasses: Record<MembershipStatus, string> = {
  ACTIVE: "border-status/45 bg-status/12 text-status",
  CANCELED: "border-muted-foreground/35 bg-muted text-muted-foreground",
  EXPIRED: "border-muted-foreground/35 bg-muted text-muted-foreground",
  PAST_DUE: "border-alert/45 bg-alert/12 text-alert",
}

export const paymentClasses: Record<PaymentStatus, string> = {
  OVERDUE: "border-alert/45 bg-alert/12 text-alert",
  PAID: "border-status/45 bg-status/12 text-status",
  PENDING: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  VOID: "border-muted-foreground/35 bg-muted text-muted-foreground",
}

export const toneClasses: Record<string, string> = {
  alert: "bg-alert",
  chart: "bg-chart-1",
  opportunity: "bg-opportunity",
  revenue: "bg-revenue",
  status: "bg-status",
}

export const severityClasses: Record<DashboardAlertSeverity, string> = {
  critical: "border-alert/45 bg-alert/12 text-alert",
  warning: "border-chart-3/45 bg-chart-3/12 text-chart-3",
  opportunity: "border-opportunity/45 bg-opportunity/12 text-opportunity",
  info: "border-chart-1/45 bg-chart-1/12 text-chart-1",
}
