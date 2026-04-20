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
  markPaidSchema,
  type MarkPaidValues,
  type MarkPaidActionResult,
} from "./mark-paid-schema"
import {
  logCheckInSchema,
  type LogCheckInValues,
  type LogCheckInActionResult,
} from "./log-checkin-schema"
import {
  voidPaymentSchema,
  type VoidPaymentValues,
  type VoidPaymentActionResult,
} from "./void-payment-schema"
import { markPaymentPaidForGym, voidPaymentForGym } from "./payment-lifecycle"
import {
  renewMembershipSchema,
  type RenewMembershipValues,
  type RenewMembershipActionResult,
} from "./renew-membership-schema"
import { renewMembershipForGym } from "./renewal-lifecycle"
import {
  createMemberSchema,
  parseDateInput,
  type CreateMemberActionResult,
  type CreateMemberValues,
} from "./member-create-schema"
import { logMemberCheckInForGym } from "./attendance-lifecycle"
import { updateMemberContactForGym } from "./member-contact-lifecycle"
import {
  updateMemberContactSchema,
  type UpdateMemberContactActionResult,
  type UpdateMemberContactValues,
} from "./update-member-contact-schema"

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

export async function updateMemberContact(
  values: UpdateMemberContactValues
): Promise<UpdateMemberContactActionResult> {
  const session = await requireDashboardSession("/members")
  const parsed = updateMemberContactSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the contact details and try again.",
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
    const result = await updateMemberContactForGym({
      client: db,
      gymId: gym.id,
      memberId: parsed.data.memberId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
    })

    if (result.status === "not-found") {
      return {
        success: false,
        error: "This member does not exist or belongs to a different gym.",
      }
    }
  } catch {
    return {
      success: false,
      error: "The contact details could not be saved. Try again.",
    }
  }

  revalidatePath("/members")
  revalidatePath(`/members/${parsed.data.memberId}`)
  revalidatePath("/")

  return { success: true }
}

export async function logMemberCheckIn(
  values: LogCheckInValues
): Promise<LogCheckInActionResult> {
  const session = await requireDashboardSession("/members")
  const parsed = logCheckInSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the attendance details and try again.",
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
      error: "Connect a gym to this owner account before logging attendance.",
    }
  }

  const attendedAt = parseDateInput(parsed.data.attendedAt)
  if (!attendedAt) {
    return { success: false, error: "Choose a valid check-in date." }
  }

  try {
    const result = await logMemberCheckInForGym({
      client: db,
      gymId: gym.id,
      memberId: parsed.data.memberId,
      attendedAt,
      notes: parsed.data.notes,
    })

    if (result.status === "not-found") {
      return {
        success: false,
        error: "This member does not exist or belongs to a different gym.",
      }
    }
  } catch {
    return {
      success: false,
      error: "The check-in could not be logged. Try again.",
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

export async function renewMembership(
  values: RenewMembershipValues
): Promise<RenewMembershipActionResult> {
  const session = await requireDashboardSession("/members")
  const parsed = renewMembershipSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the renewal details and try again.",
    }
  }

  const gym = await db.gym.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true, timezone: true },
    orderBy: { createdAt: "asc" },
  })

  if (!gym) {
    return {
      success: false,
      error: "Connect a gym to this owner account before renewing members.",
    }
  }

  const expectedCurrentPeriodEndsAt = new Date(
    parsed.data.expectedCurrentPeriodEndsAt
  )
  const parsedRenewalDate = parsed.data.renewalDate
    ? parseDateInput(parsed.data.renewalDate)
    : undefined

  if (parsed.data.renewalDate && !parsedRenewalDate) {
    return { success: false, error: "Choose a valid renewal date." }
  }

  const renewalDate = parsedRenewalDate ?? undefined

  try {
    const result = await renewMembershipForGym({
      client: db,
      gymId: gym.id,
      timezone: gym.timezone,
      membershipId: parsed.data.membershipId,
      expectedStatus: parsed.data.expectedStatus,
      expectedCurrentPeriodEndsAt,
      submissionId: parsed.data.submissionId,
      renewalDate,
    })

    if (result.status === "not-found") {
      return {
        success: false,
        error: "This membership does not exist or belongs to a different gym.",
      }
    }

    if (result.status === "not-renewable") {
      return {
        success: false,
        error: "This membership cannot be renewed from its current status.",
      }
    }

    if (result.status === "member-suspended") {
      return {
        success: false,
        error: "Unsuspend this member before renewing their membership.",
      }
    }

    if (result.status === "future-renewal-date") {
      return {
        success: false,
        error: "Choose today or an earlier date for this renewal.",
      }
    }

    if (result.status === "conflict") {
      return {
        success: false,
        error: "This membership changed. Refresh and try again.",
      }
    }

    revalidatePath("/members")
    revalidatePath(`/members/${result.memberId}`)
    revalidatePath("/subscriptions")
    revalidatePath("/")
  } catch {
    return {
      success: false,
      error: "The membership could not be renewed. Try again.",
    }
  }

  return { success: true }
}

export async function markPaymentPaid(
  values: MarkPaidValues
): Promise<MarkPaidActionResult> {
  const session = await requireDashboardSession("/members")
  const parsed = markPaidSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Check the payment and try again.",
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
      error: "Connect a gym to this owner account before managing payments.",
    }
  }

  try {
    const result = await markPaymentPaidForGym({
      client: db,
      gymId: gym.id,
      paymentId: parsed.data.paymentId,
    })

    if (result.status === "not-found") {
      return {
        success: false,
        error: "This payment does not exist or belongs to a different gym.",
      }
    }

    if (result.status === "already-resolved") {
      return {
        success: false,
        error: "This payment has already been resolved and cannot be changed.",
      }
    }

    revalidatePath("/members")
    revalidatePath(`/members/${result.memberId}`)
    revalidatePath("/")
  } catch {
    return {
      success: false,
      error: "The payment could not be recorded. Try again.",
    }
  }

  return { success: true }
}

export async function voidPayment(
  values: VoidPaymentValues
): Promise<VoidPaymentActionResult> {
  const session = await requireDashboardSession("/members")
  const parsed = voidPaymentSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Check the payment and try again.",
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
      error: "Connect a gym to this owner account before managing payments.",
    }
  }

  try {
    const result = await voidPaymentForGym({
      client: db,
      gymId: gym.id,
      paymentId: parsed.data.paymentId,
      reason: parsed.data.reason,
    })

    if (result.status === "not-found") {
      return {
        success: false,
        error: "This payment does not exist or belongs to a different gym.",
      }
    }

    if (result.status === "already-paid") {
      return {
        success: false,
        error:
          "Paid payments cannot be voided. Contact support if a refund is needed.",
      }
    }

    if (result.status === "already-void") {
      return {
        success: false,
        error: "This payment has already been voided.",
      }
    }

    if (result.status === "already-resolved") {
      return {
        success: false,
        error: "This payment has already been resolved and cannot be changed.",
      }
    }

    revalidatePath("/members")
    revalidatePath(`/members/${result.memberId}`)
    revalidatePath("/")
  } catch {
    return {
      success: false,
      error: "The payment could not be voided. Try again.",
    }
  }

  return { success: true }
}
