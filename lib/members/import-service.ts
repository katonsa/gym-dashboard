import { addBillingPeriod } from "@/lib/billing/periods"
import { parseDateInput } from "@/lib/domain/date-input"
import { mapPlanTier } from "@/lib/domain/mappers"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import {
  buildFailedMemberImportCsv,
  validateMemberImportRows,
  type MemberImportMappedRow,
  type MemberImportValidatedRow,
} from "@/lib/members/import"

type MemberImportDb = Pick<PrismaClient, "$transaction" | "member" | "planTier">

export type PreviewMemberImportForGymResult = {
  rows: MemberImportValidatedRow[]
  failedCsv: string
}

export type ConfirmMemberImportForGymResult = {
  createdMembers: number
  skippedRows: number
  duplicateOverrides: number
  failedRows: number
  failedCsv: string
}

export async function previewMemberImportForGym({
  client,
  gymId,
  rows,
  defaultJoinDate,
}: {
  client: MemberImportDb
  gymId: string
  rows: MemberImportMappedRow[]
  defaultJoinDate: string
}): Promise<PreviewMemberImportForGymResult> {
  const validatedRows = await getValidatedImportRows({
    client,
    gymId,
    rows,
    defaultJoinDate,
  })

  return {
    rows: validatedRows,
    failedCsv: buildFailedMemberImportCsv(
      validatedRows.filter((row) => row.errors.length > 0)
    ),
  }
}

export async function confirmMemberImportForGym({
  client,
  gymId,
  rows,
  defaultJoinDate,
  importDuplicateRows,
  skippedRows,
}: {
  client: MemberImportDb
  gymId: string
  rows: MemberImportMappedRow[]
  defaultJoinDate: string
  importDuplicateRows: number[]
  skippedRows: number[]
}): Promise<ConfirmMemberImportForGymResult> {
  const validatedRows = await getValidatedImportRows({
    client,
    gymId,
    rows,
    defaultJoinDate,
  })
  const duplicateOverrideRows = new Set(importDuplicateRows)
  const skippedRowNumbers = new Set(skippedRows)
  const failedRows = validatedRows.filter((row) => row.errors.length > 0)
  const rowsToCreate = validatedRows.filter((row) => {
    if (row.errors.length > 0 || skippedRowNumbers.has(row.rowNumber)) {
      return false
    }

    if (row.duplicateMatches.length > 0) {
      return duplicateOverrideRows.has(row.rowNumber)
    }

    return true
  })

  await client.$transaction(async (tx) => {
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
        throw new Error("Validated import row has invalid next billing date.")
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

  const duplicateOverrides = rowsToCreate.filter(
    (row) => row.duplicateMatches.length > 0
  ).length
  const skippedCount =
    validatedRows.length - rowsToCreate.length - failedRows.length

  return {
    createdMembers: rowsToCreate.length,
    skippedRows: skippedCount,
    duplicateOverrides,
    failedRows: failedRows.length,
    failedCsv: buildFailedMemberImportCsv(failedRows),
  }
}

async function getValidatedImportRows({
  client,
  gymId,
  rows,
  defaultJoinDate,
}: {
  client: MemberImportDb
  gymId: string
  rows: MemberImportMappedRow[]
  defaultJoinDate: string
}) {
  const [planTiers, existingMembers] = await Promise.all([
    client.planTier.findMany({
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
    client.member.findMany({
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
