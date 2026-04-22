"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"

import { invalidateDashboardCache } from "@/lib/cache/redis"
import { withGymAction } from "@/lib/application/owner-gym-action"
import { type MemberImportValidatedRow } from "@/lib/members/import"
import {
  confirmMemberImportForGym,
  previewMemberImportForGym,
} from "@/lib/members/import-service"
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
      const result = await previewMemberImportForGym({
        client: db,
        gymId,
        rows: parsed.rows,
        defaultJoinDate: parsed.defaultJoinDate,
      })

      return {
        success: true,
        ...result,
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
      const result = await confirmMemberImportForGym({
        client: db,
        gymId,
        rows: parsed.rows,
        defaultJoinDate: parsed.defaultJoinDate,
        importDuplicateRows: parsed.importDuplicateRows,
        skippedRows: parsed.skippedRows,
      })

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
      revalidatePath("/subscriptions")
      revalidatePath("/")

      return {
        success: true,
        ...result,
      }
    },
  })
}
