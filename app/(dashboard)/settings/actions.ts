"use server"

import { revalidatePath } from "next/cache"

import {
  type ActionResult,
  withGymAction,
} from "@/lib/dashboard/action-helpers"
import {
  normalizeGymSettingsValues,
  updateGymSettingsSchema,
  type UpdateGymSettingsValues,
} from "@/lib/dashboard/schemas/gym-settings-schema"
import { db } from "@/lib/db"

export async function updateGymSettings(
  values: UpdateGymSettingsValues
): Promise<ActionResult> {
  return withGymAction({
    schema: updateGymSettingsSchema,
    values,
    redirectPath: "/settings",
    validationError: "Check the gym settings and try again.",
    missingGymError:
      "Connect a gym to this owner account before changing settings.",
    failureError: "The gym settings could not be saved. Try again.",
    handler: async ({ parsed, gymId }) => {
      await db.gym.update({
        where: { id: gymId },
        data: normalizeGymSettingsValues(parsed),
        select: { id: true },
      })

      revalidatePath("/settings")
      revalidatePath("/drop-ins")
      revalidatePath("/")
      revalidatePath("/", "layout")

      return { success: true }
    },
  })
}
