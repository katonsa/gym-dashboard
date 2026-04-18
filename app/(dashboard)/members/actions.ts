"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"

import { requireDashboardSession } from "@/lib/auth/server"
import { addBillingPeriod } from "@/lib/dashboard/billing"
import { db } from "@/lib/db"
import type { BillingInterval, MemberStatus } from "@/lib/dashboard"
import {
  changePlanSchema,
  type ChangeMemberPlanValues,
  type ChangePlanActionResult,
} from "./change-plan-schema"
import {
  createMemberSchema,
  parseDateInput,
  type CreateMemberActionResult,
  type CreateMemberValues,
} from "./member-create-schema"

export type ActionResult = {
  success: boolean
  error?: string
}

export type UpdateMemberStatusValues = {
  memberId: string
  status: Extract<MemberStatus, "ACTIVE" | "SUSPENDED">
}

const updateMemberStatusSchema = z.object({
  memberId: z.string().trim().min(1, "Choose a member."),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
})

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

export async function updateMemberStatus(
  values: UpdateMemberStatusValues
): Promise<ActionResult> {
  const session = await requireDashboardSession("/members")
  const parsed = updateMemberStatusSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the status change and try again.",
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
      error: "Connect a gym to this owner account before changing members.",
    }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const member = await tx.member.findFirst({
        where: {
          id: parsed.data.memberId,
          gymId: gym.id,
        },
        select: { id: true },
      })

      if (!member) {
        return { found: false }
      }

      await tx.member.update({
        where: { id: member.id },
        data: { status: parsed.data.status },
        select: { id: true },
      })

      if (parsed.data.status === "SUSPENDED") {
        await tx.membership.updateMany({
          where: {
            memberId: member.id,
            status: "ACTIVE",
          },
          data: { status: "PAST_DUE" },
        })
      }

      return { found: true }
    })

    if (!result.found) {
      return {
        success: false,
        error: "This member does not exist or belongs to a different gym.",
      }
    }
  } catch {
    return {
      success: false,
      error: "The member status could not be changed. Try again.",
    }
  }

  revalidatePath("/members")
  revalidatePath(`/members/${parsed.data.memberId}`)
  revalidatePath("/")

  return { success: true }
}

export async function changeMemberPlan(
  values: ChangeMemberPlanValues
): Promise<ChangePlanActionResult> {
  const session = await requireDashboardSession("/members")
  const parsed = changePlanSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the plan change and try again.",
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
      error: "Connect a gym to this owner account before changing plans.",
    }
  }

  const effectiveDate = parseDateInput(parsed.data.effectiveDate)
  if (!effectiveDate) {
    return { success: false, error: "Choose a valid effective date." }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const member = await tx.member.findFirst({
        where: {
          id: parsed.data.memberId,
          gymId: gym.id,
        },
        select: { id: true },
      })

      if (!member) {
        return { status: "member-not-found" as const }
      }

      const planTier = await tx.planTier.findFirst({
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

      const billingInterval = parsed.data.billingInterval as BillingInterval
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
          gymId: gym.id,
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

    if (result.status === "member-not-found") {
      return {
        success: false,
        error: "This member does not exist or belongs to a different gym.",
      }
    }

    if (result.status === "plan-not-found") {
      return {
        success: false,
        error: "Choose an active plan for this gym.",
      }
    }
  } catch {
    return {
      success: false,
      error: "The plan could not be changed. Check the details and try again.",
    }
  }

  revalidatePath("/members")
  revalidatePath(`/members/${parsed.data.memberId}`)
  revalidatePath("/subscriptions")
  revalidatePath("/")

  return { success: true }
}
