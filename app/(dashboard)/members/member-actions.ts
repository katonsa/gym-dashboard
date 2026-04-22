"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"

import {
  type ActionResult,
  withGymAction,
} from "@/lib/application/owner-gym-action"
import { invalidateDashboardCache } from "@/lib/cache/redis"
import { logMemberCheckInForGym } from "@/lib/attendance/check-in-service"
import { updateMemberContactForGym } from "@/lib/members/contact-service"
import { createMemberForGym } from "@/lib/members/create-member-service"
import { updateMemberStatusForGym } from "@/lib/members/status-service"
import { parseDateInput } from "@/lib/domain/date-input"
import {
  createMemberSchema,
  type CreateMemberActionResult,
  type CreateMemberValues,
} from "@/lib/members/schemas/create-member-schema"
import {
  logCheckInSchema,
  type LogCheckInActionResult,
  type LogCheckInValues,
} from "@/lib/attendance/schemas/log-checkin-schema"
import {
  updateMemberContactSchema,
  type UpdateMemberContactActionResult,
  type UpdateMemberContactValues,
} from "@/lib/members/schemas/update-contact-schema"
import type { MemberStatus } from "@/lib/domain/types"
import { db } from "@/lib/db"

export type { ActionResult } from "@/lib/application/owner-gym-action"

export type UpdateMemberStatusValues = {
  memberId: string
  status: Extract<MemberStatus, "ACTIVE" | "SUSPENDED">
}

const updateMemberStatusSchema = z.object({
  memberId: z.string().trim().min(1, "Choose a member."),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
})

export async function createMember(
  values: CreateMemberValues
): Promise<CreateMemberActionResult> {
  return withGymAction({
    schema: createMemberSchema,
    values,
    redirectPath: "/members",
    validationError: "Check the member details and try again.",
    missingGymError:
      "Connect a gym to this owner account before adding members.",
    failureError:
      "The member could not be saved. Check the details and try again.",
    handler: async ({ parsed, gymId }) => {
      const result = await createMemberForGym({
        client: db,
        gymId,
        values: parsed,
      })

      if (result.status === "invalid-join-date") {
        return { success: false, error: "Choose a valid join date." }
      }

      if (result.status === "plan-not-found") {
        return {
          success: false,
          error: "Choose an active plan for this gym.",
        }
      }

      if (result.status === "duplicate") {
        return {
          success: false,
          duplicateMatches: result.duplicateMatches,
        }
      }

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
      revalidatePath("/subscriptions")
      revalidatePath("/")

      return { success: true }
    },
  })
}

export async function updateMemberStatus(
  values: UpdateMemberStatusValues
): Promise<ActionResult> {
  return withGymAction({
    schema: updateMemberStatusSchema,
    values,
    redirectPath: "/members",
    validationError: "Check the status change and try again.",
    missingGymError:
      "Connect a gym to this owner account before changing members.",
    failureError: "The member status could not be changed. Try again.",
    handler: async ({ parsed, gymId }) => {
      const result = await updateMemberStatusForGym({
        client: db,
        gymId,
        values: parsed,
      })

      if (result.status === "not-found") {
        return {
          success: false,
          error: "This member does not exist or belongs to a different gym.",
        }
      }

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
      revalidatePath(`/members/${parsed.memberId}`)
      revalidatePath("/subscriptions")
      revalidatePath("/")

      return { success: true }
    },
  })
}

export async function updateMemberContact(
  values: UpdateMemberContactValues
): Promise<UpdateMemberContactActionResult> {
  return withGymAction({
    schema: updateMemberContactSchema,
    values,
    redirectPath: "/members",
    validationError: "Check the contact details and try again.",
    missingGymError:
      "Connect a gym to this owner account before changing members.",
    failureError: "The contact details could not be saved. Try again.",
    handler: async ({ parsed, gymId }) => {
      const result = await updateMemberContactForGym({
        client: db,
        gymId,
        memberId: parsed.memberId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email,
        phone: parsed.phone,
        notes: parsed.notes,
      })

      if (result.status === "not-found") {
        return {
          success: false,
          error: "This member does not exist or belongs to a different gym.",
        }
      }

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
      revalidatePath(`/members/${parsed.memberId}`)
      revalidatePath("/")

      return { success: true }
    },
  })
}

export async function logMemberCheckIn(
  values: LogCheckInValues
): Promise<LogCheckInActionResult> {
  return withGymAction({
    schema: logCheckInSchema,
    values,
    redirectPath: "/members",
    validationError: "Check the attendance details and try again.",
    missingGymError:
      "Connect a gym to this owner account before logging attendance.",
    failureError: "The check-in could not be logged. Try again.",
    handler: async ({ parsed, gymId }) => {
      const attendedAt = parseDateInput(parsed.attendedAt)

      if (!attendedAt) {
        return { success: false, error: "Choose a valid check-in date." }
      }

      const result = await logMemberCheckInForGym({
        client: db,
        gymId,
        memberId: parsed.memberId,
        attendedAt,
        notes: parsed.notes,
      })

      if (result.status === "not-found") {
        return {
          success: false,
          error: "This member does not exist or belongs to a different gym.",
        }
      }

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
      revalidatePath(`/members/${parsed.memberId}`)
      revalidatePath("/")

      return { success: true }
    },
  })
}
