"use server"

import {
  revalidateOwnerGymCreatedPaths,
  revalidateOwnerGymLayout,
} from "@/lib/application/revalidation"
import { requireDashboardSession } from "@/lib/auth/server"
import { invalidateDashboardCache } from "@/lib/cache/redis"
import { db } from "@/lib/db"
import { createGymSchema } from "@/lib/gyms/schemas/create-gym-schema"

export type GymCreateResult = {
  success: boolean
  error?: string
}

export async function createGym(
  values: Record<string, unknown>
): Promise<GymCreateResult> {
  const session = await requireDashboardSession()
  const parsed = createGymSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the gym details and try again.",
    }
  }

  const existing = await db.gym.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  })

  if (existing) {
    await invalidateDashboardCache(existing.id)
    revalidateOwnerGymLayout()
    return { success: true }
  }

  const gym = await db.gym.create({
    data: {
      name: parsed.data.gymName,
      timezone: parsed.data.timezone,
      currencyCode: parsed.data.currencyCode,
      defaultDropInFeeAmount: Number(parsed.data.defaultDropInFeeAmount),
      ownerId: session.user.id,
    },
    select: { id: true },
  })

  await invalidateDashboardCache(gym.id)
  revalidateOwnerGymCreatedPaths()

  return { success: true }
}
