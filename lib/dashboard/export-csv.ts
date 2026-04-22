import { getGymLocalMonthWindow } from "./date-boundaries.ts"
import { toNumber } from "./aggregate-queries.ts"
import { toCsv, toDateOnly } from "./csv.ts"
import type { PrismaClient } from "../generated/prisma/client.ts"
import type { BillingInterval } from "./types.ts"

type ExportGym = {
  id: string
  timezone: string
  currencyCode: string
}

type MemberExportDb = Pick<PrismaClient, "member">
type PaymentExportDb = Pick<PrismaClient, "membershipPayment">
type DropInExportDb = Pick<PrismaClient, "dropInVisit">
type MonthlyReportDb = Pick<
  PrismaClient,
  "$queryRaw" | "dropInVisit" | "member" | "membershipPayment"
>

export async function getMembersCsv(gym: ExportGym, client: MemberExportDb) {
  const members = await client.member.findMany({
    where: { gymId: gym.id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      joinDate: true,
      lastAttendedAt: true,
      notes: true,
      memberships: {
        where: { status: { in: ["ACTIVE", "PAST_DUE", "EXPIRED"] } },
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          billingInterval: true,
          nextBillingDate: true,
          planTier: { select: { name: true } },
        },
      },
    },
  })

  return toCsv(
    [
      "name",
      "email",
      "phone",
      "status",
      "join_date",
      "current_plan",
      "billing_interval",
      "next_billing_date",
      "last_attended_date",
      "notes",
    ],
    members.map((member) => {
      const membership = member.memberships[0]

      return [
        `${member.firstName} ${member.lastName}`,
        member.email,
        member.phone,
        member.status,
        toDateOnly(member.joinDate),
        membership?.planTier.name,
        membership?.billingInterval,
        toDateOnly(membership?.nextBillingDate),
        toDateOnly(member.lastAttendedAt),
        member.notes,
      ]
    })
  )
}

export async function getMembershipPaymentsCsv(
  gym: ExportGym,
  client: PaymentExportDb
) {
  const payments = await client.membershipPayment.findMany({
    where: { gymId: gym.id },
    orderBy: [{ dueAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      memberId: true,
      amount: true,
      status: true,
      dueAt: true,
      paidAt: true,
      notes: true,
      member: { select: { firstName: true, lastName: true } },
      membership: {
        select: {
          planTier: { select: { name: true } },
        },
      },
    },
  })

  return toCsv(
    [
      "payment_id",
      "member_id",
      "member_name",
      "plan",
      "amount",
      "currency_code",
      "status",
      "due_date",
      "paid_date",
      "notes",
    ],
    payments.map((payment) => [
      payment.id,
      payment.memberId,
      `${payment.member.firstName} ${payment.member.lastName}`,
      payment.membership.planTier.name,
      payment.amount,
      gym.currencyCode,
      payment.status,
      toDateOnly(payment.dueAt),
      toDateOnly(payment.paidAt),
      payment.notes,
    ])
  )
}

export async function getDropInVisitsCsv(
  gym: ExportGym,
  client: DropInExportDb
) {
  const visits = await client.dropInVisit.findMany({
    where: { gymId: gym.id },
    orderBy: [{ visitedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      visitorName: true,
      visitorContact: true,
      visitCount: true,
      amount: true,
      visitedAt: true,
      notes: true,
    },
  })

  return toCsv(
    [
      "visit_id",
      "visitor_name",
      "visitor_contact",
      "visit_count",
      "amount",
      "currency_code",
      "visited_date",
      "notes",
    ],
    visits.map((visit) => [
      visit.id,
      visit.visitorName,
      visit.visitorContact,
      visit.visitCount,
      visit.amount,
      gym.currencyCode,
      toDateOnly(visit.visitedAt),
      visit.notes,
    ])
  )
}

export async function getMonthlyReportCsv({
  gym,
  month,
  client,
}: {
  gym: ExportGym
  month: string
  client: MonthlyReportDb
}) {
  const monthDate = parseReportMonth(month)
  const { start, end } = getGymLocalMonthWindow(monthDate, gym.timezone)
  const membershipRevenue = await getMonthlyEquivalentMembershipRevenue(
    gym.id,
    start,
    end,
    client
  )
  const dropInRevenue = await getMonthlyDropInRevenue(
    gym.id,
    start,
    end,
    client
  )
  const [newSignUps, overduePayments, renewals, activeMemberCount] =
    await Promise.all([
      client.member.count({
        where: {
          gymId: gym.id,
          joinDate: { gte: start, lt: end },
        },
      }),
      client.membershipPayment.count({
        where: {
          gymId: gym.id,
          OR: [
            { status: "OVERDUE" },
            { status: "PENDING", dueAt: { lt: end } },
          ],
        },
      }),
      getRenewalsDueCount(gym.id, start, end, client),
      client.member.count({
        where: {
          gymId: gym.id,
          status: "ACTIVE",
        },
      }),
    ])

  return toCsv(
    [
      "month",
      "membership_revenue",
      "drop_in_revenue",
      "total_revenue",
      "new_sign_ups",
      "overdue_payments",
      "renewals",
      "active_member_count",
      "currency_code",
    ],
    [
      [
        month,
        membershipRevenue,
        dropInRevenue,
        membershipRevenue + dropInRevenue,
        newSignUps,
        overduePayments,
        renewals,
        activeMemberCount,
        gym.currencyCode,
      ],
    ]
  )
}

export function parseReportMonth(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month)

  if (!match) {
    throw new Error("Month must use YYYY-MM format.")
  }

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const date = new Date(Date.UTC(year, monthIndex, 1))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthIndex) {
    throw new Error("Month must use YYYY-MM format.")
  }

  return date
}

async function getMonthlyEquivalentMembershipRevenue(
  gymId: string,
  start: Date,
  end: Date,
  client: MonthlyReportDb
) {
  const rows = await client.$queryRaw<
    Array<{ membershipRevenue: number | bigint }>
  >`
    SELECT
      COALESCE(SUM(
        CASE WHEN m."billingInterval" = 'ANNUAL'
          THEN m."priceAmount" / 12.0
          ELSE m."priceAmount"
        END
      ), 0)::float8 as "membershipRevenue"
    FROM "Membership" m
    WHERE m."memberId" IN (SELECT id FROM "Member" WHERE "gymId" = ${gymId})
      AND m."startedAt" < ${end}
      AND COALESCE(m."canceledAt", m."currentPeriodEndsAt") >= ${start}
  `

  return toNumber(rows[0]?.membershipRevenue)
}

async function getMonthlyDropInRevenue(
  gymId: string,
  start: Date,
  end: Date,
  client: MonthlyReportDb
) {
  const result = await client.dropInVisit.aggregate({
    where: {
      gymId,
      visitedAt: { gte: start, lt: end },
    },
    _sum: { amount: true },
  })

  return result._sum.amount ?? 0
}

async function getRenewalsDueCount(
  gymId: string,
  start: Date,
  end: Date,
  client: MonthlyReportDb
) {
  const rows = await client.$queryRaw<Array<{ count: number | bigint }>>`
    SELECT COUNT(*)::int as "count"
    FROM "Membership"
    WHERE "memberId" IN (
      SELECT id FROM "Member" WHERE "gymId" = ${gymId} AND "status" != 'SUSPENDED'
    )
      AND "status" IN ('ACTIVE', 'EXPIRED')
      AND "nextBillingDate" >= ${start}
      AND "nextBillingDate" < ${end}
  `

  return toNumber(rows[0]?.count)
}

export function getPaymentExportFilename() {
  return "membership-payments.csv"
}

export function getDropInExportFilename() {
  return "drop-in-visits.csv"
}

export function getMemberExportFilename() {
  return "members.csv"
}

export function getMonthlyReportExportFilename(month: string) {
  return `monthly-report-${month}.csv`
}

export function getBillingIntervalPrice(
  plan: { monthlyPriceAmount: number; annualPriceAmount: number },
  interval: BillingInterval
) {
  return interval === "ANNUAL"
    ? plan.annualPriceAmount
    : plan.monthlyPriceAmount
}
