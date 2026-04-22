import { addBillingPeriod } from "./periods.ts"
import type {
  BillingInterval,
  PrismaClient,
} from "../generated/prisma/client.ts"

type PaymentLifecycleDb = Pick<PrismaClient, "$transaction">
type PaymentLifecycleTx = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0]

type MarkPaymentPaidResult =
  | { status: "paid"; memberId: string }
  | { status: "already-resolved" }
  | { status: "not-found" }

type VoidPaymentResult =
  | { status: "voided"; memberId: string }
  | { status: "already-paid" }
  | { status: "already-resolved" }
  | { status: "already-void" }
  | { status: "not-found" }

export async function markPaymentPaidForGym({
  client,
  gymId,
  paymentId,
  now = new Date(),
}: {
  client: PaymentLifecycleDb
  gymId: string
  paymentId: string
  now?: Date
}): Promise<MarkPaymentPaidResult> {
  return client.$transaction(async (tx) => {
    const payment = await tx.membershipPayment.findFirst({
      where: {
        id: paymentId,
        gymId,
      },
      select: {
        id: true,
        memberId: true,
        membershipId: true,
        status: true,
      },
    })

    if (!payment) {
      return { status: "not-found" }
    }

    if (payment.status === "PAID" || payment.status === "VOID") {
      return { status: "already-resolved" }
    }

    const updateResult = await tx.membershipPayment.updateMany({
      where: {
        id: payment.id,
        gymId,
        status: { in: ["PENDING", "OVERDUE"] },
      },
      data: { status: "PAID", paidAt: now },
    })

    if (updateResult.count === 0) {
      return { status: "already-resolved" }
    }

    await reactivateMembershipIfSettled(tx, payment.membershipId)

    return { status: "paid", memberId: payment.memberId }
  })
}

export async function voidPaymentForGym({
  client,
  gymId,
  paymentId,
  reason,
}: {
  client: PaymentLifecycleDb
  gymId: string
  paymentId: string
  reason?: string
}): Promise<VoidPaymentResult> {
  return client.$transaction(async (tx) => {
    const payment = await tx.membershipPayment.findFirst({
      where: {
        id: paymentId,
        gymId,
      },
      select: {
        id: true,
        memberId: true,
        status: true,
        notes: true,
      },
    })

    if (!payment) {
      return { status: "not-found" }
    }

    if (payment.status === "PAID") {
      return { status: "already-paid" }
    }

    if (payment.status === "VOID") {
      return { status: "already-void" }
    }

    const updatedNotes = reason
      ? payment.notes
        ? `${payment.notes}\nVoided: ${reason}`
        : `Voided: ${reason}`
      : payment.notes

    const updateResult = await tx.membershipPayment.updateMany({
      where: {
        id: payment.id,
        gymId,
        status: { in: ["PENDING", "OVERDUE"] },
      },
      data: { status: "VOID", notes: updatedNotes },
    })

    if (updateResult.count === 0) {
      return { status: "already-resolved" }
    }

    return { status: "voided", memberId: payment.memberId }
  })
}

async function reactivateMembershipIfSettled(
  tx: PaymentLifecycleTx,
  membershipId: string
) {
  const membership = await tx.membership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      status: true,
      billingInterval: true,
      currentPeriodEndsAt: true,
    },
  })

  if (!membership || membership.status !== "PAST_DUE") {
    return
  }

  const remainingUnpaid = await tx.membershipPayment.count({
    where: {
      membershipId: membership.id,
      status: { in: ["PENDING", "OVERDUE"] },
    },
  })

  if (remainingUnpaid > 0) {
    return
  }

  const nextPeriodEnd = addBillingPeriod(
    membership.currentPeriodEndsAt,
    membership.billingInterval as BillingInterval
  )

  await tx.membership.update({
    where: { id: membership.id },
    data: {
      status: "ACTIVE",
      currentPeriodEndsAt: nextPeriodEnd,
      nextBillingDate: nextPeriodEnd,
    },
  })
}
