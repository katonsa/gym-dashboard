"use server"

import { revalidatePath } from "next/cache"

import { requireDashboardSession } from "@/lib/auth/server"
import { db } from "@/lib/db"
import {
  createDropInSchema,
  normalizeCreateDropInValues,
  type CreateDropInActionResult,
  type CreateDropInValues,
} from "./drop-in-create-schema"

export async function createDropInVisit(
  values: CreateDropInValues
): Promise<CreateDropInActionResult> {
  const session = await requireDashboardSession("/drop-ins")
  const parsed = createDropInSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the drop-in details and try again.",
    }
  }

  const gym = await db.gym.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true, defaultDropInFeeAmount: true },
    orderBy: { createdAt: "asc" },
  })

  if (!gym) {
    return {
      success: false,
      error: "Connect a gym to this owner account before adding drop-ins.",
    }
  }

  const dropInValues = normalizeCreateDropInValues(parsed.data)

  try {
    await db.dropInVisit.create({
      data: {
        gymId: gym.id,
        visitorName: dropInValues.visitorName,
        visitorContact: dropInValues.visitorContact,
        visitCount: dropInValues.visitCount,
        amount: dropInValues.amount ?? gym.defaultDropInFeeAmount,
        notes: dropInValues.notes,
      },
    })
  } catch {
    return {
      success: false,
      error: "The drop-in could not be saved. Check the details and try again.",
    }
  }

  revalidatePath("/drop-ins")

  return { success: true }
}
