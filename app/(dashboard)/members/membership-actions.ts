"use server"

import { revalidatePath } from "next/cache"

import { invalidateDashboardCache } from "@/lib/cache/redis"
import { withGymAction } from "@/lib/dashboard/action-helpers"
import { addBillingPeriod } from "@/lib/dashboard/billing"
import { parseDateInput } from "@/lib/dashboard/formatters"
import { renewMembershipForGym } from "@/lib/dashboard/renewal-lifecycle"
import {
  changePlanSchema,
  type ChangeMemberPlanValues,
  type ChangePlanActionResult,
} from "@/lib/dashboard/schemas/change-plan-schema"
import {
  renewMembershipSchema,
  type RenewMembershipActionResult,
  type RenewMembershipValues,
} from "@/lib/dashboard/schemas/renew-membership-schema"
import type { BillingInterval } from "@/lib/dashboard"
import { db } from "@/lib/db"

export async function changeMemberPlan(
  values: ChangeMemberPlanValues
): Promise<ChangePlanActionResult> {
  return withGymAction({
    schema: changePlanSchema,
    values,
    redirectPath: "/members",
    validationError: "Check the plan change and try again.",
    missingGymError:
      "Connect a gym to this owner account before changing plans.",
    failureError:
      "The plan could not be changed. Check the details and try again.",
    handler: async ({ parsed, gymId }) => {
      const effectiveDate = parseDateInput(parsed.effectiveDate)

      if (!effectiveDate) {
        return { success: false, error: "Choose a valid effective date." }
      }

      const result = await db.$transaction(async (tx) => {
        const member = await tx.member.findFirst({
          where: {
            id: parsed.memberId,
            gymId,
          },
          select: { id: true },
        })

        if (!member) {
          return { status: "member-not-found" as const }
        }

        const planTier = await tx.planTier.findFirst({
          where: {
            id: parsed.planTierId,
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

        const billingInterval = parsed.billingInterval as BillingInterval
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

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
      revalidatePath(`/members/${parsed.memberId}`)
      revalidatePath("/subscriptions")
      revalidatePath("/")

      return { success: true }
    },
  })
}

export async function renewMembership(
  values: RenewMembershipValues
): Promise<RenewMembershipActionResult> {
  return withGymAction({
    schema: renewMembershipSchema,
    values,
    redirectPath: "/members",
    validationError: "Check the renewal details and try again.",
    missingGymError:
      "Connect a gym to this owner account before renewing members.",
    failureError: "The membership could not be renewed. Try again.",
    gymSelect: { id: true, timezone: true },
    handler: async ({ parsed, gym, gymId }) => {
      const expectedCurrentPeriodEndsAt = new Date(
        parsed.expectedCurrentPeriodEndsAt
      )
      const parsedRenewalDate = parsed.renewalDate
        ? parseDateInput(parsed.renewalDate)
        : undefined

      if (parsed.renewalDate && !parsedRenewalDate) {
        return { success: false, error: "Choose a valid renewal date." }
      }

      const result = await renewMembershipForGym({
        client: db,
        gymId,
        timezone: gym.timezone ?? "UTC",
        membershipId: parsed.membershipId,
        expectedStatus: parsed.expectedStatus,
        expectedCurrentPeriodEndsAt,
        submissionId: parsed.submissionId,
        renewalDate: parsedRenewalDate ?? undefined,
      })

      if (result.status === "not-found") {
        return {
          success: false,
          error:
            "This membership does not exist or belongs to a different gym.",
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

      await invalidateDashboardCache(gymId)
      revalidatePath("/members")
      revalidatePath(`/members/${result.memberId}`)
      revalidatePath("/subscriptions")
      revalidatePath("/")

      return { success: true }
    },
  })
}
