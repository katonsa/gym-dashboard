import { cache } from "react"

import { db } from "@/lib/db"
import { getOwnerGymQuery } from "@/lib/dashboard/query-scopes"

export type OwnerGym = {
  id: string
  name: string
  timezone: string
  currencyCode: string
  defaultDropInFeeAmount: number
}

export const getOwnerGym = cache(async (ownerId: string) => {
  return db.gym.findFirst(getOwnerGymQuery(ownerId))
})
