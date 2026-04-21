import {
  getUtcDayWindow,
  getUtcMonthWindow,
  OVERVIEW_ALERT_LIMIT,
  toNumber,
} from "./aggregate-queries.ts"
import {
  getGymLocalDayWindow,
  getGymLocalMonthWindow,
} from "./date-boundaries.ts"
import type {
  ConversionLeadRawRow,
  CountRawRow,
  DashboardDb,
  DropInConversionLead,
  DropInSummary,
  DropInTotal,
  OverviewAggregateOptions,
} from "./aggregate-types.ts"

export async function getDropInTotal(
  gymId: string,
  startDate: Date,
  endDate: Date,
  client: DashboardDb
): Promise<DropInTotal> {
  const result = await client.dropInVisit.aggregate({
    where: {
      gymId,
      visitedAt: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true, visitCount: true },
  })

  return {
    revenueAmount: result._sum.amount ?? 0,
    visitCount: result._sum.visitCount ?? 0,
  }
}

export async function getConversionLeadsCount(
  gymId: string,
  monthStart: Date,
  nextMonthStart: Date,
  threshold: number,
  client: DashboardDb
) {
  const rows = await client.$queryRaw<CountRawRow[]>`
    SELECT COUNT(*)::int as "count" FROM (
      SELECT LOWER("visitorContact")
      FROM "DropInVisit"
      WHERE "gymId" = ${gymId}
        AND "visitedAt" >= ${monthStart}
        AND "visitedAt" < ${nextMonthStart}
        AND "visitorName" IS NOT NULL
        AND "visitorContact" IS NOT NULL
      GROUP BY LOWER("visitorContact")
      HAVING SUM("visitCount") >= ${threshold}
    ) as leads
  `

  return toNumber(rows[0]?.count)
}

export async function getConversionLeads(
  gymId: string,
  monthStart: Date,
  nextMonthStart: Date,
  threshold: number,
  limit: number | null = OVERVIEW_ALERT_LIMIT,
  client: DashboardDb
): Promise<DropInConversionLead[]> {
  if (limit === null) {
    const rows = await client.$queryRaw<ConversionLeadRawRow[]>`
      SELECT
        MIN("visitorName") as "visitorName",
        MIN("visitorContact") as "visitorContact",
        SUM("visitCount")::int as "visitCount",
        SUM("amount")::int as "revenueAmount"
      FROM "DropInVisit"
      WHERE "gymId" = ${gymId}
        AND "visitedAt" >= ${monthStart}
        AND "visitedAt" < ${nextMonthStart}
        AND "visitorName" IS NOT NULL
        AND "visitorContact" IS NOT NULL
      GROUP BY LOWER("visitorContact")
      HAVING SUM("visitCount") >= ${threshold}
      ORDER BY "visitCount" DESC
    `

    return mapConversionLeads(rows)
  }

  const rows = await client.$queryRaw<ConversionLeadRawRow[]>`
    SELECT
      MIN("visitorName") as "visitorName",
      MIN("visitorContact") as "visitorContact",
      SUM("visitCount")::int as "visitCount",
      SUM("amount")::int as "revenueAmount"
    FROM "DropInVisit"
    WHERE "gymId" = ${gymId}
      AND "visitedAt" >= ${monthStart}
      AND "visitedAt" < ${nextMonthStart}
      AND "visitorName" IS NOT NULL
      AND "visitorContact" IS NOT NULL
    GROUP BY LOWER("visitorContact")
    HAVING SUM("visitCount") >= ${threshold}
    ORDER BY "visitCount" DESC
    LIMIT ${limit}
  `

  return mapConversionLeads(rows)
}

export async function getDropInSummary(
  gymId: string,
  options: OverviewAggregateOptions = {},
  client: DashboardDb
): Promise<DropInSummary> {
  const asOf = options.asOf ?? new Date()
  const { dayStart, nextDayStart } = getDropInDayWindow(asOf, options.timeZone)
  const { monthStart, nextMonthStart } = getDropInMonthWindow(
    asOf,
    options.timeZone
  )
  const threshold = options.conversionVisitThreshold ?? 5
  const [dailyTotal, monthlyTotal, conversionLeads, allDropInTotal] =
    await Promise.all([
      getDropInTotal(gymId, dayStart, nextDayStart, client),
      getDropInTotal(gymId, monthStart, nextMonthStart, client),
      getConversionLeads(
        gymId,
        monthStart,
        nextMonthStart,
        threshold,
        null,
        client
      ),
      client.dropInVisit.aggregate({
        where: { gymId },
        _sum: { visitCount: true },
      }),
    ])

  return {
    dailyTotal,
    monthlyTotal,
    conversionLeads,
    hasDropIns: (allDropInTotal._sum.visitCount ?? 0) > 0,
  }
}

function getDropInDayWindow(date: Date, timeZone: string | undefined) {
  if (!timeZone) {
    return getUtcDayWindow(date)
  }

  const window = getGymLocalDayWindow(date, timeZone)

  return {
    dayStart: window.start,
    nextDayStart: window.end,
  }
}

function getDropInMonthWindow(date: Date, timeZone: string | undefined) {
  if (!timeZone) {
    return getUtcMonthWindow(date)
  }

  const window = getGymLocalMonthWindow(date, timeZone)

  return {
    monthStart: window.start,
    nextMonthStart: window.end,
  }
}

function mapConversionLeads(
  rows: ConversionLeadRawRow[]
): DropInConversionLead[] {
  return rows.map((row) => ({
    visitorName: row.visitorName,
    visitorContact: row.visitorContact,
    visitCount: toNumber(row.visitCount),
    revenueAmount: toNumber(row.revenueAmount),
  }))
}
