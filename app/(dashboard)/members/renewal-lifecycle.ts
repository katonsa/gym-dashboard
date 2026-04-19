import { addBillingPeriod } from "../../../lib/dashboard/billing.ts"
import {
  getGymLocalDateInput,
  getGymLocalDayBoundary,
} from "../../../lib/dashboard/date-boundaries.ts"
import type {
  BillingInterval,
  MembershipStatus,
  PrismaClient,
} from "../../../lib/generated/prisma/client.ts"
import { parseDateInput } from "./member-create-schema.ts"

type RenewalLifecycleDb = Pick<PrismaClient, "$transaction">

type RenewalResult =
  | { status: "renewed"; memberId: string }
  | { status: "already-renewed"; memberId: string }
  | { status: "not-found" }
  | { status: "not-renewable" }
  | { status: "member-suspended" }
  | { status: "future-renewal-date" }
  | { status: "conflict" }

const renewalSubmissionNotePrefix = "Renewal submission:"

export async function renewMembershipForGym({
  client,
  gymId,
  timezone,
  membershipId,
  expectedStatus,
  expectedCurrentPeriodEndsAt,
  submissionId,
  renewalDate,
  now = new Date(),
}: {
  client: RenewalLifecycleDb
  gymId: string
  timezone: string
  membershipId: string
  expectedStatus: Extract<MembershipStatus, "ACTIVE" | "EXPIRED">
  expectedCurrentPeriodEndsAt: Date
  submissionId: string
  renewalDate?: Date
  now?: Date
}): Promise<RenewalResult> {
  const asOf = getGymLocalDayBoundary(now, timezone)
  const recordingDate = parseDateInput(getGymLocalDateInput(now, timezone))

  if (!recordingDate) {
    throw new Error("Unable to determine the gym-local recording date.")
  }

  if (renewalDate && renewalDate.getTime() > recordingDate.getTime()) {
    return { status: "future-renewal-date" }
  }

  const requestedRenewalDate = renewalDate ?? recordingDate
  const submissionNote = getRenewalSubmissionNote(submissionId)

  return client.$transaction(async (tx) => {
    const existingPayment = await tx.membershipPayment.findFirst({
      where: {
        gymId,
        membershipId,
        notes: { contains: submissionNote },
      },
      select: { memberId: true },
    })

    if (existingPayment) {
      return {
        status: "already-renewed" as const,
        memberId: existingPayment.memberId,
      }
    }

    const membership = await tx.membership.findFirst({
      where: {
        id: membershipId,
        member: { gymId },
      },
      select: {
        id: true,
        memberId: true,
        billingInterval: true,
        status: true,
        priceAmount: true,
        currentPeriodEndsAt: true,
        member: { select: { status: true } },
      },
    })

    if (!membership) {
      return { status: "not-found" as const }
    }

    if (membership.status !== "ACTIVE" && membership.status !== "EXPIRED") {
      return { status: "not-renewable" as const }
    }

    if (membership.member.status === "SUSPENDED") {
      return { status: "member-suspended" as const }
    }

    const isCurrent =
      membership.status === "ACTIVE" &&
      membership.currentPeriodEndsAt.getTime() >= asOf.getTime()
    const advanceFrom = isCurrent
      ? membership.currentPeriodEndsAt
      : requestedRenewalDate
    const nextPeriodEnd = addBillingPeriod(
      advanceFrom,
      membership.billingInterval as BillingInterval
    )

    const updateResult = await tx.membership.updateMany({
      where: {
        id: membership.id,
        status: expectedStatus,
        currentPeriodEndsAt: expectedCurrentPeriodEndsAt,
      },
      data: {
        status: "ACTIVE",
        currentPeriodEndsAt: nextPeriodEnd,
        nextBillingDate: nextPeriodEnd,
      },
    })

    if (updateResult.count === 0) {
      const paymentAfterConflict = await tx.membershipPayment.findFirst({
        where: {
          gymId,
          membershipId,
          notes: { contains: submissionNote },
        },
        select: { memberId: true },
      })

      if (paymentAfterConflict) {
        return {
          status: "already-renewed" as const,
          memberId: paymentAfterConflict.memberId,
        }
      }

      return { status: "conflict" as const }
    }

    await tx.membershipPayment.create({
      data: {
        gymId,
        memberId: membership.memberId,
        membershipId: membership.id,
        amount: membership.priceAmount,
        status: "PENDING",
        dueAt: recordingDate,
        notes: submissionNote,
      },
    })

    return { status: "renewed" as const, memberId: membership.memberId }
  })
}

export function getRenewalSubmissionNote(submissionId: string) {
  return `${renewalSubmissionNotePrefix} ${submissionId}`
}
