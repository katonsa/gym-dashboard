import type * as z from "zod"

import type { PrismaClient } from "@/lib/generated/prisma/client"
import {
  normalizeGymSettingsValues,
  type updateGymSettingsSchema,
} from "@/lib/gyms/schemas/settings-schema"

type GymSettingsDb = Pick<PrismaClient, "gym">
type UpdateGymSettingsValues = z.output<typeof updateGymSettingsSchema>

export async function updateGymSettingsForGym({
  client,
  gymId,
  values,
}: {
  client: GymSettingsDb
  gymId: string
  values: UpdateGymSettingsValues
}) {
  await client.gym.update({
    where: { id: gymId },
    data: normalizeGymSettingsValues(values),
    select: { id: true },
  })
}
