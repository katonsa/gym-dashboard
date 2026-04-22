"use server"

import { revalidatePath } from "next/cache"

import { invalidateDashboardCache } from "@/lib/cache/redis"
import { withGymAction } from "@/lib/application/owner-gym-action"
import {
  markPaymentPaidForGym,
  voidPaymentForGym,
} from "@/lib/billing/payment-service"
import {
  markPaidSchema,
  type MarkPaidActionResult,
  type MarkPaidValues,
} from "@/lib/billing/schemas/mark-paid-schema"
import {
  voidPaymentSchema,
  type VoidPaymentActionResult,
  type VoidPaymentValues,
} from "@/lib/billing/schemas/void-payment-schema"
import { db } from "@/lib/db"

export type { ActionResult } from "@/lib/application/owner-gym-action"

export async function markPaymentPaid(
  values: MarkPaidValues
): Promise<MarkPaidActionResult> {
  return withGymAction({
    schema: markPaidSchema,
    values,
    redirectPath: "/members",
    validationError: "Check the payment and try again.",
    missingGymError:
      "Connect a gym to this owner account before managing payments.",
    failureError: "The payment could not be recorded. Try again.",
    handler: async ({ parsed, gymId }) => {
      const result = await markPaymentPaidForGym({
        client: db,
        gymId,
        paymentId: parsed.paymentId,
      })

      if (result.status === "not-found") {
        return {
          success: false,
          error: "This payment does not exist or belongs to a different gym.",
        }
      }

      if (result.status === "already-resolved") {
        return {
          success: false,
          error:
            "This payment has already been resolved and cannot be changed.",
        }
      }

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
      revalidatePath(`/members/${result.memberId}`)
      revalidatePath("/subscriptions")
      revalidatePath("/")

      return { success: true }
    },
  })
}

export async function voidPayment(
  values: VoidPaymentValues
): Promise<VoidPaymentActionResult> {
  return withGymAction({
    schema: voidPaymentSchema,
    values,
    redirectPath: "/members",
    validationError: "Check the payment and try again.",
    missingGymError:
      "Connect a gym to this owner account before managing payments.",
    failureError: "The payment could not be voided. Try again.",
    handler: async ({ parsed, gymId }) => {
      const result = await voidPaymentForGym({
        client: db,
        gymId,
        paymentId: parsed.paymentId,
        reason: parsed.reason,
      })

      if (result.status === "not-found") {
        return {
          success: false,
          error: "This payment does not exist or belongs to a different gym.",
        }
      }

      if (result.status === "already-paid") {
        return {
          success: false,
          error:
            "Paid payments cannot be voided. Contact support if a refund is needed.",
        }
      }

      if (result.status === "already-void") {
        return {
          success: false,
          error: "This payment has already been voided.",
        }
      }

      if (result.status === "already-resolved") {
        return {
          success: false,
          error:
            "This payment has already been resolved and cannot be changed.",
        }
      }

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
      revalidatePath(`/members/${result.memberId}`)
      revalidatePath("/subscriptions")
      revalidatePath("/")

      return { success: true }
    },
  })
}
