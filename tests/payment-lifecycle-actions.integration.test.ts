import assert from "node:assert/strict"
import test from "node:test"

import {
  markPaymentPaidForGym,
  voidPaymentForGym,
} from "../lib/dashboard/payment-lifecycle.ts"
import { db } from "../lib/db.ts"

test("marking the last unpaid payment paid reactivates the membership", async () => {
  const fixture = await createPaymentLifecycleFixture({
    membershipStatus: "PAST_DUE",
    paymentStatus: "OVERDUE",
  })
  const paidAt = new Date("2026-04-19T10:30:00.000Z")

  try {
    assert.deepEqual(
      await markPaymentPaidForGym({
        client: db,
        gymId: fixture.gymId,
        paymentId: fixture.paymentId,
        now: paidAt,
      }),
      { status: "paid", memberId: fixture.memberId }
    )

    const payment = await db.membershipPayment.findUniqueOrThrow({
      where: { id: fixture.paymentId },
      select: { status: true, paidAt: true },
    })
    const membership = await db.membership.findUniqueOrThrow({
      where: { id: fixture.membershipId },
      select: {
        status: true,
        currentPeriodEndsAt: true,
        nextBillingDate: true,
      },
    })

    assert.equal(payment.status, "PAID")
    assert.deepEqual(payment.paidAt, paidAt)
    assert.equal(membership.status, "ACTIVE")
    assert.deepEqual(
      membership.currentPeriodEndsAt,
      new Date("2026-05-01T00:00:00.000Z")
    )
    assert.deepEqual(
      membership.nextBillingDate,
      new Date("2026-05-01T00:00:00.000Z")
    )
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("marking paid keeps a membership past due while another unpaid payment remains", async () => {
  const fixture = await createPaymentLifecycleFixture({
    membershipStatus: "PAST_DUE",
    paymentStatus: "PENDING",
    extraPaymentStatus: "OVERDUE",
  })

  try {
    assert.deepEqual(
      await markPaymentPaidForGym({
        client: db,
        gymId: fixture.gymId,
        paymentId: fixture.paymentId,
        now: new Date("2026-04-19T10:30:00.000Z"),
      }),
      { status: "paid", memberId: fixture.memberId }
    )

    const membership = await db.membership.findUniqueOrThrow({
      where: { id: fixture.membershipId },
      select: { status: true, currentPeriodEndsAt: true },
    })

    assert.equal(membership.status, "PAST_DUE")
    assert.deepEqual(
      membership.currentPeriodEndsAt,
      new Date("2026-04-01T00:00:00.000Z")
    )
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("voiding an overdue payment appends the reason without reactivating membership", async () => {
  const fixture = await createPaymentLifecycleFixture({
    membershipStatus: "PAST_DUE",
    paymentStatus: "OVERDUE",
    paymentNotes: "Created in error.",
  })

  try {
    assert.deepEqual(
      await voidPaymentForGym({
        client: db,
        gymId: fixture.gymId,
        paymentId: fixture.paymentId,
        reason: "Duplicate invoice",
      }),
      { status: "voided", memberId: fixture.memberId }
    )

    const payment = await db.membershipPayment.findUniqueOrThrow({
      where: { id: fixture.paymentId },
      select: { status: true, notes: true },
    })
    const membership = await db.membership.findUniqueOrThrow({
      where: { id: fixture.membershipId },
      select: { status: true },
    })

    assert.equal(payment.status, "VOID")
    assert.equal(payment.notes, "Created in error.\nVoided: Duplicate invoice")
    assert.equal(membership.status, "PAST_DUE")
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("payment lifecycle actions reject resolved or cross-gym payments", async () => {
  const fixture = await createPaymentLifecycleFixture({
    paymentStatus: "PAID",
    paidAt: new Date("2026-04-10T00:00:00.000Z"),
  })
  const otherFixture = await createPaymentLifecycleFixture({
    paymentStatus: "PENDING",
  })

  try {
    assert.deepEqual(
      await markPaymentPaidForGym({
        client: db,
        gymId: fixture.gymId,
        paymentId: fixture.paymentId,
      }),
      { status: "already-resolved" }
    )
    assert.deepEqual(
      await voidPaymentForGym({
        client: db,
        gymId: fixture.gymId,
        paymentId: fixture.paymentId,
      }),
      { status: "already-paid" }
    )
    assert.deepEqual(
      await markPaymentPaidForGym({
        client: db,
        gymId: fixture.gymId,
        paymentId: otherFixture.paymentId,
      }),
      { status: "not-found" }
    )
  } finally {
    await deleteFixture(fixture.userId)
    await deleteFixture(otherFixture.userId)
  }
})

type FixtureOptions = {
  membershipStatus?: "ACTIVE" | "PAST_DUE"
  paymentStatus: "PENDING" | "PAID" | "OVERDUE" | "VOID"
  extraPaymentStatus?: "PENDING" | "OVERDUE"
  paymentNotes?: string
  paidAt?: Date
}

async function createPaymentLifecycleFixture(options: FixtureOptions) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const userId = `test-owner-${suffix}`

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: userId,
        name: "Payment Lifecycle Owner",
        email: `payment-lifecycle-${suffix}@example.test`,
        emailVerified: true,
      },
      select: { id: true },
    })
    const gym = await tx.gym.create({
      data: {
        ownerId: user.id,
        name: `Payment Lifecycle Gym ${suffix}`,
        timezone: "UTC",
        currencyCode: "IDR",
        defaultDropInFeeAmount: 75000,
      },
      select: { id: true },
    })
    const plan = await tx.planTier.create({
      data: {
        gymId: gym.id,
        name: `Lifecycle Plan ${suffix}`,
        monthlyPriceAmount: 650000,
        annualPriceAmount: 6500000,
        sortOrder: 1,
      },
      select: { id: true },
    })
    const member = await tx.member.create({
      data: {
        gymId: gym.id,
        firstName: "Payment",
        lastName: "Lifecycle",
        status: "ACTIVE",
        joinDate: new Date("2026-03-01T00:00:00.000Z"),
      },
      select: { id: true },
    })
    const membership = await tx.membership.create({
      data: {
        memberId: member.id,
        planTierId: plan.id,
        billingInterval: "MONTHLY",
        status: options.membershipStatus ?? "ACTIVE",
        priceAmount: 650000,
        startedAt: new Date("2026-03-01T00:00:00.000Z"),
        currentPeriodEndsAt: new Date("2026-04-01T00:00:00.000Z"),
        nextBillingDate: new Date("2026-04-01T00:00:00.000Z"),
      },
      select: { id: true },
    })
    const payment = await tx.membershipPayment.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        membershipId: membership.id,
        amount: 650000,
        status: options.paymentStatus,
        dueAt: new Date("2026-04-01T00:00:00.000Z"),
        paidAt: options.paidAt,
        notes: options.paymentNotes,
      },
      select: { id: true },
    })

    if (options.extraPaymentStatus) {
      await tx.membershipPayment.create({
        data: {
          gymId: gym.id,
          memberId: member.id,
          membershipId: membership.id,
          amount: 650000,
          status: options.extraPaymentStatus,
          dueAt: new Date("2026-04-10T00:00:00.000Z"),
        },
      })
    }

    return {
      userId: user.id,
      gymId: gym.id,
      memberId: member.id,
      membershipId: membership.id,
      paymentId: payment.id,
    }
  })

  return result
}

async function deleteFixture(userId: string) {
  const gyms = await db.gym.findMany({
    where: { ownerId: userId },
    select: { id: true },
  })
  const gymIds = gyms.map((gym) => gym.id)

  await db.$transaction([
    db.membershipPayment.deleteMany({ where: { gymId: { in: gymIds } } }),
    db.attendanceRecord.deleteMany({ where: { gymId: { in: gymIds } } }),
    db.dropInVisit.deleteMany({ where: { gymId: { in: gymIds } } }),
    db.membership.deleteMany({
      where: { member: { gymId: { in: gymIds } } },
    }),
    db.member.deleteMany({ where: { gymId: { in: gymIds } } }),
    db.planTier.deleteMany({ where: { gymId: { in: gymIds } } }),
    db.gym.deleteMany({ where: { id: { in: gymIds } } }),
    db.user.deleteMany({ where: { id: userId } }),
  ])
}
