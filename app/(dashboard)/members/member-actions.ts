"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"

import {
  type ActionResult,
  withGymAction,
} from "@/lib/dashboard/action-helpers"
import { invalidateDashboardCache } from "@/lib/cache/redis"
import { addBillingPeriod } from "@/lib/dashboard/billing"
import { logMemberCheckInForGym } from "@/lib/dashboard/attendance-lifecycle"
import { findPotentialMemberDuplicatesForGym } from "@/lib/dashboard/member-duplicate-detection"
import { updateMemberContactForGym } from "@/lib/dashboard/member-contact-lifecycle"
import { parseDateInput } from "@/lib/dashboard/formatters"
import {
  createMemberSchema,
  type CreateMemberActionResult,
  type CreateMemberValues,
} from "@/lib/dashboard/schemas/member-create-schema"
import {
  logCheckInSchema,
  type LogCheckInActionResult,
  type LogCheckInValues,
} from "@/lib/dashboard/schemas/log-checkin-schema"
import {
  updateMemberContactSchema,
  type UpdateMemberContactActionResult,
  type UpdateMemberContactValues,
} from "@/lib/dashboard/schemas/update-member-contact-schema"
import type { BillingInterval, MemberStatus } from "@/lib/dashboard"
import { db } from "@/lib/db"

export type { ActionResult } from "@/lib/dashboard/action-helpers"

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
      const joinDate = parseDateInput(parsed.joinDate)

      if (!joinDate) {
        return { success: false, error: "Choose a valid join date." }
      }

      const billingInterval = parsed.billingInterval as
        | BillingInterval
        | undefined
      const planTier = parsed.planTierId
        ? await db.planTier.findFirst({
            where: {
              id: parsed.planTierId,
              gymId,
              isActive: true,
            },
            select: {
              id: true,
              monthlyPriceAmount: true,
              annualPriceAmount: true,
            },
          })
        : null

      if (parsed.planTierId && !planTier) {
        return {
          success: false,
          error: "Choose an active plan for this gym.",
        }
      }

      const duplicateMatches = await findPotentialMemberDuplicatesForGym({
        client: db,
        gymId,
        input: {
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          email: parsed.email,
          phone: parsed.phone,
        },
      })

      if (duplicateMatches.length > 0 && !parsed.confirmDuplicate) {
        return {
          success: false,
          duplicateMatches,
        }
      }

      await db.$transaction(async (tx) => {
        const member = await tx.member.create({
          data: {
            gymId,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            email: parsed.email,
            phone: parsed.phone,
            status: parsed.status,
            joinDate,
            notes: parsed.notes,
          },
          select: { id: true },
        })

        if (!planTier || !billingInterval) {
          return
        }

        const priceAmount =
          billingInterval === "ANNUAL"
            ? planTier.annualPriceAmount
            : planTier.monthlyPriceAmount
        const nextBillingDate = addBillingPeriod(joinDate, billingInterval)

        const membership = await tx.membership.create({
          data: {
            memberId: member.id,
            planTierId: planTier.id,
            billingInterval,
            status: "ACTIVE",
            priceAmount,
            startedAt: joinDate,
            currentPeriodEndsAt: nextBillingDate,
            nextBillingDate,
          },
          select: { id: true },
        })

        await tx.membershipPayment.create({
          data: {
            gymId,
            memberId: member.id,
            membershipId: membership.id,
            amount: priceAmount,
            status: "PENDING",
            dueAt: joinDate,
            notes: "Initial membership payment.",
          },
        })
      })

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
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
      const result = await db.$transaction(async (tx) => {
        const member = await tx.member.findFirst({
          where: {
            id: parsed.memberId,
            gymId,
          },
          select: { id: true },
        })

        if (!member) {
          return { found: false }
        }

        await tx.member.update({
          where: { id: member.id },
          data: { status: parsed.status },
          select: { id: true },
        })

        if (parsed.status === "SUSPENDED") {
          await tx.membership.updateMany({
            where: {
              memberId: member.id,
              status: "ACTIVE",
            },
            data: { status: "PAST_DUE" },
          })
        }

        return { found: true }
      })

      if (!result.found) {
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
