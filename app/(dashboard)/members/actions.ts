"use server"

import { revalidatePath } from "next/cache"

import { requireDashboardSession } from "@/lib/auth/server"
import { db } from "@/lib/db"
import type { BillingInterval } from "@/lib/dashboard"
import {
  createMemberSchema,
  parseDateInput,
  type CreateMemberActionResult,
  type CreateMemberValues,
} from "./member-create-schema"

export async function createMember(
  values: CreateMemberValues
): Promise<CreateMemberActionResult> {
  const session = await requireDashboardSession("/members")
  const parsed = createMemberSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the member details and try again.",
    }
  }

  const gym = await db.gym.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  })

  if (!gym) {
    return {
      success: false,
      error: "Connect a gym to this owner account before adding members.",
    }
  }

  const joinDate = parseDateInput(parsed.data.joinDate)
  if (!joinDate) {
    return { success: false, error: "Choose a valid join date." }
  }

  const billingInterval = parsed.data.billingInterval as
    | BillingInterval
    | undefined

  try {
    const planTier = parsed.data.planTierId
      ? await db.planTier.findFirst({
          where: {
            id: parsed.data.planTierId,
            gymId: gym.id,
            isActive: true,
          },
          select: {
            id: true,
            monthlyPriceAmount: true,
            annualPriceAmount: true,
          },
        })
      : null

    if (parsed.data.planTierId && !planTier) {
      return {
        success: false,
        error: "Choose an active plan for this gym.",
      }
    }

    await db.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          gymId: gym.id,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          email: parsed.data.email,
          phone: parsed.data.phone,
          status: parsed.data.status,
          joinDate,
          notes: parsed.data.notes,
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
          gymId: gym.id,
          memberId: member.id,
          membershipId: membership.id,
          amount: priceAmount,
          status: "PENDING",
          dueAt: joinDate,
          notes: "Initial membership payment.",
        },
      })
    })
  } catch {
    return {
      success: false,
      error: "The member could not be saved. Check the details and try again.",
    }
  }

  revalidatePath("/members")

  return { success: true }
}

function addBillingPeriod(date: Date, billingInterval: BillingInterval) {
  return addMonthsClamped(date, billingInterval === "ANNUAL" ? 12 : 1)
}

function addMonthsClamped(date: Date, monthCount: number) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const targetMonth = month + monthCount
  const targetYear = year + Math.floor(targetMonth / 12)
  const normalizedTargetMonth = ((targetMonth % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, normalizedTargetMonth + 1, 0)
  ).getUTCDate()
  const day = Math.min(date.getUTCDate(), lastDayOfTargetMonth)

  return new Date(Date.UTC(targetYear, normalizedTargetMonth, day))
}
