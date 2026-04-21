"use server"

import { revalidatePath } from "next/cache"

import { requireDashboardSession } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { createGymSchema } from "@/lib/dashboard/schemas/gym-create-schema"

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
    revalidatePath("/", "layout")
    return { success: true }
  }

  await db.gym.create({
    data: {
      name: parsed.data.gymName,
      timezone: parsed.data.timezone,
      currencyCode: parsed.data.currencyCode,
      defaultDropInFeeAmount: Number(parsed.data.defaultDropInFeeAmount),
      ownerId: session.user.id,
    },
  })

  revalidatePath("/", "layout")
  revalidatePath("/")
  revalidatePath("/settings")
  revalidatePath("/drop-ins")
  revalidatePath("/members")
  revalidatePath("/subscriptions")

  return { success: true }
}
