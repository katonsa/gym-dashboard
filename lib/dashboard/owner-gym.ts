import { cache } from "react"

import { db } from "@/lib/db"

export type OwnerGym = {
  id: string
  name: string
  timezone: string
  currencyCode: string
  defaultDropInFeeAmount: number
}

export const getOwnerGym = cache(async (ownerId: string) => {
  return db.gym.findFirst({
    where: {
      ownerId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      timezone: true,
      currencyCode: true,
      defaultDropInFeeAmount: true,
    },
  })
})
