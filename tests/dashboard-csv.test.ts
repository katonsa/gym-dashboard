import { describe, expect, test } from "vitest"

import { escapeCsvCell, toCsv } from "../lib/dashboard/csv.ts"
import { getMonthlyReportCsv } from "../lib/dashboard/export-csv.ts"

describe("dashboard CSV helpers", () => {
  test("escapes commas, quotes, and newlines", () => {
    expect(escapeCsvCell('A "quoted", value')).toBe('"A ""quoted"", value"')
    expect(escapeCsvCell("Line\nbreak")).toBe('"Line\nbreak"')
  })

  test("builds CSV rows with blank nullish cells", () => {
    expect(
      toCsv(
        ["name", "notes"],
        [
          ["Ari", null],
          ["Sinta", "monthly, active"],
        ]
      )
    ).toBe('name,notes\nAri,\nSinta,"monthly, active"')
  })

  test("builds monthly report CSV from shared gym-local revenue trend data", async () => {
    const memberCountCalls: unknown[] = []
    const paymentCountCalls: unknown[] = []
    const rawCalls: { strings: readonly string[]; values: unknown[] }[] = []
    const db = mockMonthlyReportDb({
      member: {
        count: async (args: unknown) => {
          memberCountCalls.push(args)

          return memberCountCalls.length === 1 ? 2 : 11
        },
      },
      membershipPayment: {
        count: async (args: unknown) => {
          paymentCountCalls.push(args)

          return 4
        },
      },
      $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
        rawCalls.push({ strings: Array.from(strings), values })

        if (strings.join(" ").includes('WITH month_windows AS')) {
          return [
            { month: "Dec", membershipRevenue: 0, dropInRevenue: 0 },
            { month: "Jan", membershipRevenue: 0, dropInRevenue: 0 },
            { month: "Feb", membershipRevenue: 0, dropInRevenue: 0 },
            { month: "Mar", membershipRevenue: 0, dropInRevenue: 0 },
            { month: "Apr", membershipRevenue: 0, dropInRevenue: 0 },
            {
              month: "May",
              membershipRevenue: 500000,
              dropInRevenue: 120000,
            },
          ]
        }

        return [{ count: 3 }]
      },
    })

    expect(
      await getMonthlyReportCsv({
        gym: {
          id: "gym-1",
          timezone: "America/New_York",
          currencyCode: "USD",
        },
        month: "2026-05",
        client: db,
      })
    ).toBe(
      [
        "month,membership_revenue,drop_in_revenue,total_revenue,new_sign_ups,overdue_payments,renewals,active_member_count,currency_code",
        "2026-05,500000,120000,620000,2,4,3,11,USD",
      ].join("\n")
    )

    const monthStart = new Date("2026-05-01T04:00:00.000Z")
    const nextMonthStart = new Date("2026-06-01T04:00:00.000Z")

    expect(memberCountCalls[0]).toStrictEqual({
      where: {
        gymId: "gym-1",
        joinDate: { gte: monthStart, lt: nextMonthStart },
      },
    })
    expect(memberCountCalls[1]).toStrictEqual({
      where: {
        gymId: "gym-1",
        status: "ACTIVE",
      },
    })
    expect(paymentCountCalls[0]).toStrictEqual({
      where: {
        gymId: "gym-1",
        OR: [
          { status: "OVERDUE" },
          { status: "PENDING", dueAt: { lt: nextMonthStart } },
        ],
      },
    })
    expect(rawCalls[0]?.strings.join(" ")).toMatch(/WITH month_windows AS/)
    expect(rawCalls[0]?.strings.join(" ")).toMatch(/INNER JOIN "Member" member/)
    expect(rawCalls[0]?.strings.join(" ")).not.toMatch(
      /IN \(SELECT id FROM "Member"/
    )
    expect(hasRawCallDate(rawCalls, "2026-05-01T04:00:00.000Z")).toBe(true)
    expect(hasRawCallDate(rawCalls, "2026-06-01T04:00:00.000Z")).toBe(true)
    expect(rawCalls[1]?.values).toStrictEqual(["gym-1", monthStart, nextMonthStart])
  })
})

function mockMonthlyReportDb(
  overrides: {
    member?: Record<string, unknown>
    membership?: Record<string, unknown>
    membershipPayment?: Record<string, unknown>
    dropInVisit?: Record<string, unknown>
    planTier?: Record<string, unknown>
    $queryRaw?: unknown
  } = {}
) {
  return {
    member: {
      groupBy: async () => [],
      count: async () => 0,
      findMany: async () => [],
      ...overrides.member,
    },
    membership: {
      aggregate: async () => ({ _sum: { priceAmount: null } }),
      count: async () => 0,
      findMany: async () => [],
      ...overrides.membership,
    },
    membershipPayment: {
      count: async () => 0,
      findMany: async () => [],
      ...overrides.membershipPayment,
    },
    dropInVisit: {
      aggregate: async () => ({ _sum: { amount: null, visitCount: null } }),
      ...overrides.dropInVisit,
    },
    planTier: {
      count: async () => 0,
      findMany: async () => [],
      ...overrides.planTier,
    },
    $queryRaw: async () => [],
    ...overrides,
  } as never
}

function hasRawCallDate(
  rawCalls: { strings: readonly string[]; values: unknown[] }[],
  isoDate: string
) {
  return rawCalls.some((call) =>
    call.values.some(
      (value) => value instanceof Date && value.toISOString() === isoDate
    )
  )
}
