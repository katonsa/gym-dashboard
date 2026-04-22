import type * as z from "zod"

import { addBillingPeriod } from "@/lib/billing/periods"
import { parseDateInput } from "@/lib/domain/date-input"
import type { BillingInterval } from "@/lib/domain/types"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { changePlanSchema } from "@/lib/memberships/schemas/change-plan-schema"

type PlanChangeDb = Pick<PrismaClient, "$transaction">
type ChangePlanValues = z.output<typeof changePlanSchema>

export type ChangeMemberPlanForGymResult =
  | { status: "changed" }
  | { status: "invalid-effective-date" }
  | { status: "member-not-found" }
  | { status: "plan-not-found" }

export async function changeMemberPlanForGym({
  client,
  gymId,
  values,
}: {
  client: PlanChangeDb
  gymId: string
  values: ChangePlanValues
}): Promise<ChangeMemberPlanForGymResult> {
  const effectiveDate = parseDateInput(values.effectiveDate)

  if (!effectiveDate) {
    return { status: "invalid-effective-date" }
  }

  return client.$transaction(async (tx) => {
    const member = await tx.member.findFirst({
      where: {
        id: values.memberId,
        gymId,
      },
      select: { id: true },
    })

    if (!member) {
      return { status: "member-not-found" as const }
    }

    const planTier = await tx.planTier.findFirst({
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

    if (!planTier) {
      return { status: "plan-not-found" as const }
    }

    await tx.membership.updateMany({
      where: {
        memberId: member.id,
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRED",
        canceledAt: effectiveDate,
        currentPeriodEndsAt: effectiveDate,
        nextBillingDate: effectiveDate,
      },
    })

    const billingInterval = values.billingInterval as BillingInterval
    const priceAmount =
      billingInterval === "ANNUAL"
        ? planTier.annualPriceAmount
        : planTier.monthlyPriceAmount
    const nextBillingDate = addBillingPeriod(effectiveDate, billingInterval)

    const membership = await tx.membership.create({
      data: {
        memberId: member.id,
        planTierId: planTier.id,
        billingInterval,
        status: "ACTIVE",
        priceAmount,
        startedAt: effectiveDate,
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
        dueAt: effectiveDate,
        notes: "First payment after plan change.",
      },
    })

    return { status: "changed" as const }
  })
}
