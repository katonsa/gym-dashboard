"use server"

import { revalidatePath } from "next/cache"

import { invalidateDashboardCache } from "@/lib/cache/redis"
import { withGymAction } from "@/lib/dashboard/action-helpers"
import { db } from "@/lib/db"
import {
  createDropInSchema,
  normalizeCreateDropInValues,
  type CreateDropInActionResult,
  type CreateDropInValues,
} from "@/lib/dashboard/schemas/drop-in-create-schema"

export async function createDropInVisit(
  values: CreateDropInValues
): Promise<CreateDropInActionResult> {
  return withGymAction({
    schema: createDropInSchema,
    values,
    redirectPath: "/drop-ins",
    validationError: "Check the drop-in details and try again.",
    missingGymError:
      "Connect a gym to this owner account before adding drop-ins.",
    failureError:
      "The drop-in could not be saved. Check the details and try again.",
    gymSelect: { id: true, defaultDropInFeeAmount: true },
    handler: async ({ parsed, gym, gymId }) => {
      const dropInValues = normalizeCreateDropInValues(parsed)
      const defaultAmount = gym.defaultDropInFeeAmount

      if (defaultAmount === undefined) {
        throw new Error("Default drop-in amount was not selected.")
      }

      await db.dropInVisit.create({
        data: {
          gymId,
          visitorName: dropInValues.visitorName,
          visitorContact: dropInValues.visitorContact,
          visitCount: dropInValues.visitCount,
          amount: dropInValues.amount ?? defaultAmount,
          notes: dropInValues.notes,
        },
      })

      await invalidateDashboardCache(gymId)
      revalidatePath("/drop-ins")
      revalidatePath("/")

      return { success: true }
    },
  })
}
