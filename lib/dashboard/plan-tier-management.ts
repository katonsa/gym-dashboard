import type { db } from "../db.ts"
import { mapPlanTier } from "./mappers.ts"
import type { createPlanTierSchema } from "./schemas/plan-tier-schema.ts"
import type { PlanTier } from "./types.ts"

type PlanTierManagementClient = Pick<
  typeof db,
  "membership" | "planTier" | "$transaction"
>

type PlanTierValues = ReturnType<typeof createPlanTierSchema.parse>

export type PlanTierManagementRow = Omit<PlanTier, "gymId"> & {
  activeMembershipsCount: number
}

export type PlanTierMutationResult =
  | { status: "created"; planTierId: string }
  | { status: "updated"; planTierId: string }
  | { status: "deactivated"; planTierId: string }
  | { status: "duplicate-name" }
  | { status: "not-found" }

const revenueMembershipStatuses = ["ACTIVE", "PAST_DUE"] as const

export async function getPlanTierManagementRows(
  gymId: string,
  client: PlanTierManagementClient
): Promise<PlanTierManagementRow[]> {
  const [planTiers, membershipCounts] = await Promise.all([
    client.planTier.findMany({
      where: { gymId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        gymId: true,
        name: true,
        description: true,
        monthlyPriceAmount: true,
        annualPriceAmount: true,
        isActive: true,
        sortOrder: true,
      },
    }),
    client.membership.groupBy({
      by: ["planTierId"],
      where: {
        status: {
          in: [...revenueMembershipStatuses],
        },
        planTier: {
          gymId,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ])
  const membershipCountByPlanId = new Map(
    membershipCounts.map((row) => [row.planTierId, row._count._all])
  )

  return planTiers.map((planTier) => {
    const mapped = mapPlanTier(planTier)
    return {
      id: mapped.id,
      name: mapped.name,
      description: mapped.description,
      monthlyPriceAmount: mapped.monthlyPriceAmount,
      annualPriceAmount: mapped.annualPriceAmount,
      isActive: mapped.isActive,
      sortOrder: mapped.sortOrder,
      activeMembershipsCount: membershipCountByPlanId.get(planTier.id) ?? 0,
    }
  })
}

export async function createPlanTierForGym({
  client,
  gymId,
  values,
}: {
  client: PlanTierManagementClient
  gymId: string
  values: PlanTierValues
}): Promise<PlanTierMutationResult> {
  return client.$transaction(async (tx) => {
    const duplicate = await tx.planTier.findFirst({
      where: {
        gymId,
        name: {
          equals: values.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    })

    if (duplicate) {
      return { status: "duplicate-name" }
    }

    const planTier = await tx.planTier.create({
      data: {
        gymId,
        ...toPlanTierData(values),
      },
      select: { id: true },
    })

    return { status: "created", planTierId: planTier.id }
  })
}

export async function updatePlanTierForGym({
  client,
  gymId,
  planTierId,
  values,
}: {
  client: PlanTierManagementClient
  gymId: string
  planTierId: string
  values: PlanTierValues
}): Promise<PlanTierMutationResult> {
  return client.$transaction(async (tx) => {
    const planTier = await tx.planTier.findFirst({
      where: {
        id: planTierId,
        gymId,
      },
      select: { id: true },
    })

    if (!planTier) {
      return { status: "not-found" }
    }

    const duplicate = await tx.planTier.findFirst({
      where: {
        gymId,
        id: {
          not: planTier.id,
        },
        name: {
          equals: values.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    })

    if (duplicate) {
      return { status: "duplicate-name" }
    }

    await tx.planTier.update({
      where: { id: planTier.id },
      data: toPlanTierData(values),
      select: { id: true },
    })

    return { status: "updated", planTierId: planTier.id }
  })
}

export async function deactivatePlanTierForGym({
  client,
  gymId,
  planTierId,
}: {
  client: PlanTierManagementClient
  gymId: string
  planTierId: string
}): Promise<PlanTierMutationResult> {
  return client.$transaction(async (tx) => {
    const result = await tx.planTier.updateMany({
      where: {
        id: planTierId,
        gymId,
      },
      data: {
        isActive: false,
      },
    })

    if (result.count === 0) {
      return { status: "not-found" }
    }

    return { status: "deactivated", planTierId }
  })
}

function toPlanTierData(values: PlanTierValues) {
  return {
    name: values.name,
    description: values.description ?? null,
    monthlyPriceAmount: Number(values.monthlyPriceAmount),
    annualPriceAmount: Number(values.annualPriceAmount),
    sortOrder: Number(values.sortOrder),
    isActive: values.isActive,
  }
}
