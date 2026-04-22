import { describe, expect, test } from "vitest"

import {
  buildFailedMemberImportCsv,
  detectMemberImportMapping,
  mapCsvObjectsToMemberImportRows,
  validateMemberImportRows,
} from "../lib/members/import.ts"
import type { PlanTier } from "../lib/domain/types.ts"

const plans: PlanTier[] = [
  {
    id: "basic",
    gymId: "gym-1",
    name: "Basic",
    description: "Starter",
    monthlyPriceAmount: 100,
    annualPriceAmount: 1000,
    isActive: true,
    sortOrder: 1,
  },
]

describe("member CSV import", () => {
  test("auto-detects common headers and maps rows", () => {
    const mapping = detectMemberImportMapping([
      "Member Name",
      "Email Address",
      "Membership Plan",
      "Billing Interval",
    ])

    expect(mapping).toStrictEqual({
      fullName: "Member Name",
      email: "Email Address",
      plan: "Membership Plan",
      billingInterval: "Billing Interval",
    })

    expect(
      mapCsvObjectsToMemberImportRows(
        [
          {
            "Member Name": "Ari Putra",
            "Email Address": "ari@example.test",
          },
        ],
        mapping
      )
    ).toStrictEqual([
      {
        rowNumber: 2,
        values: {
          fullName: "Ari Putra",
          email: "ari@example.test",
        },
      },
    ])
  })

  test("validates members, duplicates, and active plan memberships", () => {
    const rows = validateMemberImportRows({
      rows: [
        {
          rowNumber: 2,
          values: {
            fullName: "Ari Putra",
            email: "ari@example.test",
            status: "",
            joinDate: "04/22/2026",
            plan: "basic",
            billingInterval: "annual",
          },
        },
      ],
      planTiers: plans,
      existingMembers: [
        {
          id: "member-1",
          firstName: "Ari",
          lastName: "Putra",
          email: "ari@example.test",
          phone: null,
          status: "ACTIVE",
        },
      ],
      defaultJoinDate: "2026-04-22",
    })

    expect(rows[0]?.errors).toStrictEqual([])
    expect(rows[0]?.defaultAction).toBe("skip")
    expect(rows[0]?.duplicateMatches[0]?.reasons).toStrictEqual([
      "email",
      "similar-name",
    ])
    expect(rows[0]?.normalized).toMatchObject({
      firstName: "Ari",
      lastName: "Putra",
      joinDate: "2026-04-22",
      planTierId: "basic",
      billingInterval: "ANNUAL",
      membershipPriceAmount: 1000,
    })
  })

  test("allows unmatched plan rows without memberships and records warning", () => {
    const rows = validateMemberImportRows({
      rows: [
        {
          rowNumber: 2,
          values: {
            firstName: "Sinta",
            lastName: "Wijaya",
            plan: "Premium",
            billingInterval: "monthly",
          },
        },
      ],
      planTiers: plans,
      existingMembers: [],
      defaultJoinDate: "2026-04-22",
    })

    expect(rows[0]?.errors).toStrictEqual([])
    expect(rows[0]?.warnings[0]).toContain("does not match an active plan")
    expect(rows[0]?.normalized.planTierId).toBeUndefined()
  })

  test("includes invalid row reasons in failed CSV", () => {
    const rows = validateMemberImportRows({
      rows: [{ rowNumber: 2, values: { fullName: "Ari" } }],
      planTiers: plans,
      existingMembers: [],
      defaultJoinDate: "2026-04-22",
    })

    expect(buildFailedMemberImportCsv(rows)).toContain(
      "Enter a full name or first and last name."
    )
  })
})
