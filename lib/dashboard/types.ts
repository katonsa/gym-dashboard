export const dashboardRoutes = [
  {
    href: "/",
    label: "Overview",
    description: "Daily alerts, revenue, and membership health.",
  },
  {
    href: "/members",
    label: "Members",
    description: "Search, filter, and inspect member billing status.",
  },
  {
    href: "/subscriptions",
    label: "Subscriptions",
    description: "Plan mix, tier revenue, and recurring revenue trends.",
  },
  {
    href: "/drop-ins",
    label: "Drop-ins",
    description: "Day-pass log, monthly totals, and conversion leads.",
  },
] as const

export type DashboardRoute = (typeof dashboardRoutes)[number]
export type DashboardRouteHref = DashboardRoute["href"]

export type DashboardNavigationModel = {
  primaryRoute: "/"
  secondaryViews: "separate-routes"
  routes: readonly DashboardRoute[]
}

export const dashboardNavigationModel: DashboardNavigationModel = {
  primaryRoute: "/",
  secondaryViews: "separate-routes",
  routes: dashboardRoutes,
}

export type CurrencyCode = string
export type DateString = string

export type BillingInterval = "MONTHLY" | "ANNUAL"
export type MemberStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED"
export type MembershipStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED"
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "VOID"
export type AttendanceSource = "MANUAL" | "DROP_IN"
export type PlanTierName = string

export type MoneyAmount = {
  amount: number
  currencyCode: CurrencyCode
}

export type GymProfile = {
  id: string
  name: string
  timezone: string
  currencyCode: CurrencyCode
  defaultDropInFeeAmount: number
}

export type PlanTier = {
  id: string
  gymId: string
  name: PlanTierName
  description?: string
  monthlyPriceAmount: number
  annualPriceAmount: number
  isActive: boolean
  sortOrder: number
}

export type Member = {
  id: string
  gymId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  status: MemberStatus
  joinDate: DateString
  lastAttendedAt?: DateString
  notes?: string
}

export type Membership = {
  id: string
  memberId: string
  planTierId: string
  billingInterval: BillingInterval
  status: MembershipStatus
  priceAmount: number
  startedAt: DateString
  currentPeriodEndsAt: DateString
  nextBillingDate: DateString
  canceledAt?: DateString
}

export type MembershipPayment = {
  id: string
  gymId: string
  memberId: string
  membershipId: string
  amount: number
  status: PaymentStatus
  dueAt: DateString
  paidAt?: DateString
  notes?: string
}

export type AttendanceRecord = {
  id: string
  gymId: string
  memberId: string
  attendedAt: DateString
  source: AttendanceSource
  notes?: string
}

export type DropInVisit = {
  id: string
  gymId: string
  visitorName?: string
  visitorContact?: string
  visitCount: number
  amount: number
  visitedAt: DateString
  notes?: string
}

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
