import type * as z from "zod"

import { addBillingPeriod } from "@/lib/billing/periods"
import { parseDateInput } from "@/lib/domain/date-input"
import type { BillingInterval } from "@/lib/domain/types"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { findPotentialMemberDuplicatesForGym } from "@/lib/members/duplicate-detection"
import type { createMemberSchema } from "@/lib/members/schemas/create-member-schema"

type CreateMemberDb = Pick<PrismaClient, "$transaction" | "member" | "planTier">

type CreateMemberValues = z.output<typeof createMemberSchema>

export type CreateMemberForGymResult =
  | { status: "created" }
  | { status: "invalid-join-date" }
  | { status: "plan-not-found" }
  | {
      status: "duplicate"
      duplicateMatches: Awaited<
        ReturnType<typeof findPotentialMemberDuplicatesForGym>
      >
    }

export async function createMemberForGym({
  client,
  gymId,
  values,
}: {
  client: CreateMemberDb
  gymId: string
  values: CreateMemberValues
}): Promise<CreateMemberForGymResult> {
  const joinDate = parseDateInput(values.joinDate)

  if (!joinDate) {
    return { status: "invalid-join-date" }
  }

  const billingInterval = values.billingInterval as BillingInterval | undefined
  const planTier = values.planTierId
    ? await client.planTier.findFirst({
        where: {
          id: values.planTierId,
          gymId,
          isActive: true,
        },
        select: {
          id: true,
          monthlyPriceAmount: true,
          annualPriceAmount: true,
        },
      })
    : null

  if (values.planTierId && !planTier) {
    return { status: "plan-not-found" }
  }

  const duplicateMatches = await findPotentialMemberDuplicatesForGym({
    client,
    gymId,
    input: {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
    },
  })

  if (duplicateMatches.length > 0 && !values.confirmDuplicate) {
    return { status: "duplicate", duplicateMatches }
  }

  await client.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        gymId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        status: values.status,
        joinDate,
        notes: values.notes,
      },
      select: { id: true },
    })

    if (!planTier || !billingInterval) {
      return
    }

    const priceAmount =
      billingInterval === "ANNUAL"
        ? planTier.annualPriceAmount
        : planTier.monthlyPriceAmount
    const nextBillingDate = addBillingPeriod(joinDate, billingInterval)

    const membership = await tx.membership.create({
      data: {
        memberId: member.id,
        planTierId: planTier.id,
        billingInterval,
        status: "ACTIVE",
        priceAmount,
        startedAt: joinDate,
        currentPeriodEndsAt: nextBillingDate,
        nextBillingDate,
      },
      select: { id: true },
    })

    await tx.membershipPayment.create({
      data: {
        gymId,
        memberId: member.id,
        membershipId: membership.id,
        amount: priceAmount,
        status: "PENDING",
        dueAt: joinDate,
        notes: "Initial membership payment.",
      },
    })
  })

  return { status: "created" }
}
