import type {
  CurrencyCode,
  DateString,
  MembershipStatus,
} from "@/lib/domain/types"

export type DashboardAlertSeverity =
  | "info"
  | "warning"
  | "critical"
  | "opportunity"

export type DashboardAlert = {
  id: string
  type:
    | "EXPIRING_MEMBERSHIP"
    | "EXPIRED_MEMBERSHIP"
    | "OVERDUE_PAYMENT"
    | "INACTIVE_MEMBER"
    | "DROP_IN_CONVERSION"
  severity: DashboardAlertSeverity
  title: string
  detail: string
  memberId?: string
  membershipId?: string
  membershipStatus?: Extract<MembershipStatus, "ACTIVE" | "EXPIRED">
  paymentId?: string
  paymentAmount?: number
  visitorContact?: string
  dueAt?: DateString
}

export type DashboardSummary = {
  asOf: DateString
  currencyCode: CurrencyCode
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  suspendedMembers: number
  newSignUpsThisMonth: number
  membershipMrrAmount: number
  dropInRevenueThisMonthAmount: number
  totalRevenueThisMonthAmount: number
  expiringMembershipsCount: number
  expiredMembershipsCount: number
  overduePaymentsCount: number
  inactiveMembersCount: number
  dropInConversionOpportunitiesCount: number
}
