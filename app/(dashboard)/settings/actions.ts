"use server"

import {
  revalidateGymSettingsPaths,
  revalidatePlanTierManagementPaths,
} from "@/lib/application/revalidation"
import { invalidateDashboardCache } from "@/lib/cache/redis"
import {
  type ActionResult,
  withGymAction,
} from "@/lib/application/owner-gym-action"
import {
  updateGymSettingsSchema,
  type UpdateGymSettingsValues,
} from "@/lib/gyms/schemas/settings-schema"
import { updateGymSettingsForGym } from "@/lib/gyms/settings-service"
import {
  createPlanTierSchema,
  deactivatePlanTierSchema,
  updatePlanTierSchema,
  type CreatePlanTierValues,
  type DeactivatePlanTierValues,
  type PlanTierActionResult,
  type UpdatePlanTierValues,
} from "@/lib/plans/schemas/plan-tier-schema"
import {
  createPlanTierForGym,
  deactivatePlanTierForGym,
  updatePlanTierForGym,
} from "@/lib/plans/plan-tier-service"
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
      await updateGymSettingsForGym({
        client: db,
        gymId,
        values: parsed,
      })

      await invalidateDashboardCache(gymId)
      revalidateGymSettingsPaths()

      return { success: true }
    },
  })
}

export async function createPlanTier(
  values: CreatePlanTierValues
): Promise<PlanTierActionResult> {
  return withGymAction({
    schema: createPlanTierSchema,
    values,
    redirectPath: "/settings",
    validationError: "Check the plan details and try again.",
    missingGymError: "Connect a gym to this owner account before adding plans.",
    failureError: "The plan could not be saved. Try again.",
    handler: async ({ parsed, gymId }) => {
      const result = await createPlanTierForGym({
        client: db,
        gymId,
        values: parsed,
      })

      if (result.status === "duplicate-name") {
        return {
          success: false,
          error: "A plan with this name already exists.",
        }
      }

      await revalidatePlanTierPaths(gymId)

      return { success: true }
    },
  })
}

export async function updatePlanTier(
  values: UpdatePlanTierValues
): Promise<PlanTierActionResult> {
  return withGymAction({
    schema: updatePlanTierSchema,
    values,
    redirectPath: "/settings",
    validationError: "Check the plan details and try again.",
    missingGymError:
      "Connect a gym to this owner account before changing plans.",
    failureError: "The plan could not be saved. Try again.",
    handler: async ({ parsed, gymId }) => {
      const result = await updatePlanTierForGym({
        client: db,
        gymId,
        planTierId: parsed.planTierId,
        values: parsed,
      })

      if (result.status === "not-found") {
        return {
          success: false,
          error: "This plan does not exist or belongs to a different gym.",
        }
      }

      if (result.status === "duplicate-name") {
        return {
          success: false,
          error: "A plan with this name already exists.",
        }
      }

      await revalidatePlanTierPaths(gymId)

      return { success: true }
    },
  })
}

export async function deactivatePlanTier(
  values: DeactivatePlanTierValues
): Promise<PlanTierActionResult> {
  return withGymAction({
    schema: deactivatePlanTierSchema,
    values,
    redirectPath: "/settings",
    validationError: "Choose a plan to deactivate.",
    missingGymError:
      "Connect a gym to this owner account before changing plans.",
    failureError: "The plan could not be deactivated. Try again.",
    handler: async ({ parsed, gymId }) => {
      const result = await deactivatePlanTierForGym({
        client: db,
        gymId,
        planTierId: parsed.planTierId,
      })

      if (result.status === "not-found") {
        return {
          success: false,
          error: "This plan does not exist or belongs to a different gym.",
        }
      }

      await revalidatePlanTierPaths(gymId)

      return { success: true }
    },
  })
}

async function revalidatePlanTierPaths(gymId: string) {
  await invalidateDashboardCache(gymId)
  revalidatePlanTierManagementPaths()
}
