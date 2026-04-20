import type * as z from "zod"

import { requireDashboardSession } from "@/lib/auth/server"
import { db } from "@/lib/db"

export type ActionResult = {
  success: boolean
  error?: string
}

type DashboardGym = {
  id: string
  timezone?: string
  defaultDropInFeeAmount?: number
}

type GymSelect = {
  id: true
  timezone?: true
  defaultDropInFeeAmount?: true
}

type DashboardRedirectPath = Parameters<typeof requireDashboardSession>[0]

export async function withGymAction<
  Schema extends z.ZodType,
  Result extends ActionResult,
>({
  schema,
  values,
  redirectPath,
  validationError,
  missingGymError,
  failureError,
  gymSelect = { id: true },
  handler,
}: {
  schema: Schema
  values: z.input<Schema>
  redirectPath: DashboardRedirectPath
  validationError: string
  missingGymError: string
  failureError: string
  gymSelect?: GymSelect
  handler: (context: {
    parsed: z.output<Schema>
    gym: DashboardGym
    gymId: string
  }) => Promise<Result>
}): Promise<Result> {
  const session = await requireDashboardSession(redirectPath)
  const parsed = schema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? validationError,
    } as Result
  }

  const gym = await db.gym.findFirst({
    where: { ownerId: session.user.id },
    select: gymSelect,
    orderBy: { createdAt: "asc" },
  })

  if (!gym) {
    return {
      success: false,
      error: missingGymError,
    } as Result
  }

  try {
    return await handler({
      parsed: parsed.data,
      gym,
      gymId: gym.id,
    })
  } catch {
    return {
      success: false,
      error: failureError,
    } as Result
  }
}
