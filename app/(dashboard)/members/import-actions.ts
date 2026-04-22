"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"

import { invalidateDashboardCache } from "@/lib/cache/redis"
import { withGymAction } from "@/lib/dashboard/action-helpers"
import { addBillingPeriod } from "@/lib/dashboard/billing"
import { parseDateInput } from "@/lib/dashboard/formatters"
import {
  buildFailedMemberImportCsv,
  validateMemberImportRows,
  type MemberImportMappedRow,
  type MemberImportValidatedRow,
} from "@/lib/dashboard/member-import"
import { mapPlanTier } from "@/lib/dashboard/mappers"
import { db } from "@/lib/db"

const importRowSchema = z.object({
  rowNumber: z.number().int().min(2),
  values: z.record(z.string(), z.string().optional()),
})

const previewMemberImportSchema = z.object({
  rows: z.array(importRowSchema).max(2000),
  defaultJoinDate: z.string().trim().min(1),
})

const confirmMemberImportSchema = z.object({
  rows: z.array(importRowSchema).max(2000),
  defaultJoinDate: z.string().trim().min(1),
  importDuplicateRows: z.array(z.number().int().min(2)).default([]),
  skippedRows: z.array(z.number().int().min(2)).default([]),
})

export type PreviewMemberImportActionResult =
  | {
      success: true
      rows: MemberImportValidatedRow[]
      failedCsv: string
    }
  | { success: false; error: string }

export type ConfirmMemberImportActionResult =
  | {
      success: true
      createdMembers: number
      skippedRows: number
      duplicateOverrides: number
      failedRows: number
      failedCsv: string
    }
  | { success: false; error: string }

export async function previewMemberImport(
  values: z.input<typeof previewMemberImportSchema>
): Promise<PreviewMemberImportActionResult> {
  return withGymAction({
    schema: previewMemberImportSchema,
    values,
    redirectPath: "/members",
    validationError: "Check the import rows and try again.",
    missingGymError:
      "Connect a gym to this owner account before importing members.",
    failureError: "The import preview could not be prepared. Try again.",
    handler: async ({ parsed, gymId }) => {
      const rows = await getValidatedImportRows({
        gymId,
        rows: parsed.rows,
        defaultJoinDate: parsed.defaultJoinDate,
      })

      return {
        success: true,
        rows,
        failedCsv: buildFailedMemberImportCsv(
          rows.filter((row) => row.errors.length > 0)
        ),
      }
    },
  })
}

export async function confirmMemberImport(
  values: z.input<typeof confirmMemberImportSchema>
): Promise<ConfirmMemberImportActionResult> {
  return withGymAction({
    schema: confirmMemberImportSchema,
    values,
    redirectPath: "/members",
    validationError: "Check the import rows and try again.",
    missingGymError:
      "Connect a gym to this owner account before importing members.",
    failureError: "The members could not be imported. Try again.",
    handler: async ({ parsed, gymId }) => {
      const rows = await getValidatedImportRows({
        gymId,
        rows: parsed.rows,
        defaultJoinDate: parsed.defaultJoinDate,
      })
      const duplicateOverrideRows = new Set(parsed.importDuplicateRows)
      const skippedRows = new Set(parsed.skippedRows)
      const failedRows = rows.filter((row) => row.errors.length > 0)
      const rowsToCreate = rows.filter((row) => {
        if (row.errors.length > 0 || skippedRows.has(row.rowNumber)) {
          return false
        }

        if (row.duplicateMatches.length > 0) {
          return duplicateOverrideRows.has(row.rowNumber)
        }

        return true
      })

      await db.$transaction(async (tx) => {
        for (const row of rowsToCreate) {
          const joinDate = parseDateInput(row.normalized.joinDate)

          if (!joinDate) {
            throw new Error("Validated import row has invalid join date.")
          }

          const member = await tx.member.create({
            data: {
              gymId,
              firstName: row.normalized.firstName,
              lastName: row.normalized.lastName,
              email: row.normalized.email,
              phone: row.normalized.phone,
              status: row.normalized.status,
              joinDate,
              lastAttendedAt: row.normalized.lastAttendedDate
                ? parseDateInput(row.normalized.lastAttendedDate)
                : undefined,
              notes: row.normalized.notes,
            },
            select: { id: true },
          })

          if (!row.normalized.planTierId || !row.normalized.billingInterval) {
            continue
          }

          const nextBillingDate = row.normalized.nextBillingDate
            ? parseDateInput(row.normalized.nextBillingDate)
            : addBillingPeriod(joinDate, row.normalized.billingInterval)

          if (!nextBillingDate) {
            throw new Error(
              "Validated import row has invalid next billing date."
            )
          }

          await tx.membership.create({
            data: {
              memberId: member.id,
              planTierId: row.normalized.planTierId,
              billingInterval: row.normalized.billingInterval,
              status: "ACTIVE",
              priceAmount: row.normalized.membershipPriceAmount ?? 0,
              startedAt: joinDate,
              currentPeriodEndsAt: nextBillingDate,
              nextBillingDate,
            },
          })
        }
      })

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
      revalidatePath("/subscriptions")
      revalidatePath("/")

      const duplicateOverrides = rowsToCreate.filter(
        (row) => row.duplicateMatches.length > 0
      ).length
      const skippedCount = rows.length - rowsToCreate.length - failedRows.length

      return {
        success: true,
        createdMembers: rowsToCreate.length,
        skippedRows: skippedCount,
        duplicateOverrides,
        failedRows: failedRows.length,
        failedCsv: buildFailedMemberImportCsv(failedRows),
      }
    },
  })
}

async function getValidatedImportRows({
  gymId,
  rows,
  defaultJoinDate,
}: {
  gymId: string
  rows: MemberImportMappedRow[]
  defaultJoinDate: string
}) {
  const [planTiers, existingMembers] = await Promise.all([
    db.planTier.findMany({
      where: { gymId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        gymId: true,
        name: true,
        description: true,
        monthlyPriceAmount: true,
        annualPriceAmount: true,
        isActive: true,
        sortOrder: true,
      },
    }),
    db.member.findMany({
      where: { gymId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
      },
    }),
  ])

  return validateMemberImportRows({
    rows,
    planTiers: planTiers.map(mapPlanTier),
    existingMembers,
    defaultJoinDate,
  })
}
