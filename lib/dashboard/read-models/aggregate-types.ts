import type { DateString, MemberStatus, PlanTier } from "@/lib/domain/types"
import type {
  DashboardAlert,
  DashboardSummary,
} from "@/lib/dashboard/read-models/types"

export type DashboardDb = {
  member: {
    groupBy: (args: unknown) => Promise<MemberStatusCountRow[]>
    count: (args: unknown) => Promise<number>
    findMany: (args: unknown) => Promise<InactiveMemberAlertRow[]>
  }
  membership: {
    aggregate: (args: unknown) => Promise<SumAggregateResult>
    count: (args: unknown) => Promise<number>
    findMany: (args: unknown) => Promise<ExpiringMembershipAlertRow[]>
  }
  membershipPayment: {
    count: (args: unknown) => Promise<number>
    findMany: (args: unknown) => Promise<OverduePaymentAlertRow[]>
  }
  dropInVisit: {
    aggregate: (args: unknown) => Promise<DropInTotalAggregateResult>
  }
  planTier: {
    count: (args: unknown) => Promise<number>
    findMany: (args: unknown) => Promise<PlanTier[]>
  }
  $queryRaw: <T = unknown>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>
}

export type MemberStatusCountRow = {
  status: MemberStatus
  _count: {
    _all: number
  }
}

export type SumAggregateResult = {
  _sum: {
    priceAmount: number | null
  }
}

export type DropInTotalAggregateResult = {
  _sum: {
    amount: number | null
    visitCount?: number | null
  }
}

export type PlanBreakdownRawRow = {
  planTierId: string
  memberCount: number | bigint
  monthlyMemberships: number | bigint
  annualMemberships: number | bigint
  monthlyEquivalentRevenue: number | bigint
}

export type PlanUsageRawRow = {
  planTierId: string
}

export type MembershipRevenueTrendRawRow = {
  month: Date | string
  membershipRevenue: number | bigint
}

export type DropInRevenueTrendRawRow = {
  month: Date | string
  dropInRevenue: number | bigint
}

export type CountRawRow = {
  count: number | bigint
}

export type AgingBucketRawRow = {
  bucket: string
  count: number | bigint
  totalAmount: number | bigint
}

export type ConversionLeadRawRow = {
  visitorName: string
  visitorContact: string
  visitCount: number | bigint
  revenueAmount: number | bigint
}

export type ExpiringMembershipAlertRow = {
  id: string
  memberId: string
  status: "ACTIVE" | "EXPIRED"
  currentPeriodEndsAt: Date | string
  member: {
    firstName: string
    lastName: string
  }
}

export type OverduePaymentAlertRow = {
  id: string
  memberId: string
  membershipId: string
  amount: number
  dueAt: Date | string
  member: {
    firstName: string
    lastName: string
  }
}

export type InactiveMemberAlertRow = {
  id: string
  firstName: string
  lastName: string
  lastAttendedAt: Date | string | null
}

export type OverviewSetupState = {
  hasPlanTiers: boolean
  hasMembers: boolean
  hasMemberships: boolean
  hasDropIns: boolean
}

export type OverviewSummaryResult = {
  summary: DashboardSummary
  setupState: OverviewSetupState
}

export type DropInConversionLead = {
  visitorName: string
  visitorContact: string
  visitCount: number
  revenueAmount: number
}

export type DropInTotal = {
  revenueAmount: number
  visitCount: number
}

export type DropInSummary = {
  dailyTotal: DropInTotal
  monthlyTotal: DropInTotal
  conversionLeads: DropInConversionLead[]
  hasDropIns: boolean
}

export type SubscriptionPlanBreakdownRow = {
  id: string
  name: string
  description?: string
  memberCount: number
  memberShare: number
  monthlyMemberships: number
  annualMemberships: number
  monthlyEquivalentRevenue: number
}

export type SubscriptionRevenueTrendRow = {
  month: string
  membership: number
  dropIns: number
  total: number
}

export type SubscriptionSetupState = {
  hasPlanTiers: boolean
  hasActiveRevenueMemberships: boolean
  hasRevenueRecords: boolean
}

export type SubscriptionSummary = {
  planTiers: PlanTier[]
  planBreakdown: SubscriptionPlanBreakdownRow[]
  revenueTrend: SubscriptionRevenueTrendRow[]
  setupState: SubscriptionSetupState
}

export type OverdueAgingBucket = {
  bucket: string
  count: number
  totalAmount: number
}

export type OverdueAgingSummary = OverdueAgingBucket[]

export type OverviewAggregateOptions = {
  asOf?: Date
  timeZone?: string
  membershipAsOf?: Date
  expiringMonthlyWindowDays?: number
  expiringAnnualWindowDays?: number
  inactiveWindowDays?: number
  conversionVisitThreshold?: number
  alertLimit?: number
}

export type OverviewDateRanges = {
  asOf: Date
  membershipAsOf: Date
  monthStart: Date
  nextMonthStart: Date
  monthlyWindowEnd: Date
  annualWindowEnd: Date
  inactiveCutoff: Date
  conversionVisitThreshold: number
  alertLimit: number
}

export type MonthWindow = {
  monthStart: Date
  nextMonthStart: Date
}

export type DayWindow = {
  dayStart: Date
  nextDayStart: Date
}

export type { DashboardAlert, DateString, PlanTier }
