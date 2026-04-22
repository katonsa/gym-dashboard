"use server"

import { revalidatePath } from "next/cache"

import { invalidateDashboardCache } from "@/lib/cache/redis"
import { withGymAction } from "@/lib/application/owner-gym-action"
import { createDropInVisitForGym } from "@/lib/drop-ins/create-visit-service"
import { db } from "@/lib/db"
import {
  createDropInSchema,
  type CreateDropInActionResult,
  type CreateDropInValues,
} from "@/lib/drop-ins/schemas/create-drop-in-schema"

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
      await createDropInVisitForGym({
        client: db,
        gymId,
        defaultAmount: gym.defaultDropInFeeAmount,
        values: parsed,
      })

      await invalidateDashboardCache(gymId)
      revalidatePath("/drop-ins")
      revalidatePath("/subscriptions")
      revalidatePath("/")

      return { success: true }
    },
  })
}
