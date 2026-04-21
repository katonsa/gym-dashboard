import { expect, test } from "vitest"

import {
  getRenewalSubmissionNote,
  renewMembershipForGym,
} from "../lib/dashboard/renewal-lifecycle.ts"
import {
  getMembershipMrr,
  type DashboardDb,
} from "../lib/dashboard/aggregates.ts"
import { db } from "../lib/db.ts"

test("renewing a current active membership advances from its period end", async () => {
  const fixture = await createRenewalFixture({
    membershipStatus: "ACTIVE",
    currentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
  })
  const submissionId = "d791294f-7c19-4d30-8ef8-8739aa9de70c"

  try {
    expect(
      await renewMembershipForGym({
        client: db,
        gymId: fixture.gymId,
        timezone: "UTC",
        membershipId: fixture.membershipId,
        expectedStatus: "ACTIVE",
        expectedCurrentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
        submissionId,
        now: new Date("2026-04-19T10:00:00.000Z"),
      })
    ).toStrictEqual({ status: "renewed", memberId: fixture.memberId })

    const membership = await getMembership(fixture.membershipId)
    const payments = await getRenewalPayments(fixture.membershipId)

    expect(membership.status).toBe("ACTIVE")
    expect(membership.currentPeriodEndsAt).toStrictEqual(
      new Date("2026-05-25T00:00:00.000Z")
    )
    expect(membership.nextBillingDate).toStrictEqual(
      new Date("2026-05-25T00:00:00.000Z")
    )
    expect(membership.startedAt).toStrictEqual(fixture.startedAt)
    expect(payments.length).toBe(1)
    expect(payments[0]?.amount).toBe(650000)
    expect(payments[0]?.status).toBe("PENDING")
    expect(payments[0]?.dueAt).toStrictEqual(
      new Date("2026-04-19T00:00:00.000Z")
    )
    expect(payments[0]?.notes).toBe(getRenewalSubmissionNote(submissionId))
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("renewing an expired membership advances from gym-local today by default", async () => {
  const fixture = await createRenewalFixture({
    membershipStatus: "EXPIRED",
    currentPeriodEndsAt: new Date("2026-03-01T00:00:00.000Z"),
  })

  try {
    expect(
      await renewMembershipForGym({
        client: db,
        gymId: fixture.gymId,
        timezone: "Asia/Jakarta",
        membershipId: fixture.membershipId,
        expectedStatus: "EXPIRED",
        expectedCurrentPeriodEndsAt: new Date("2026-03-01T00:00:00.000Z"),
        submissionId: "18c6202f-17d5-4da8-b463-ffeb88d0f132",
        now: new Date("2026-04-18T18:30:00.000Z"),
      })
    ).toStrictEqual({ status: "renewed", memberId: fixture.memberId })

    const membership = await getMembership(fixture.membershipId)
    const payments = await getRenewalPayments(fixture.membershipId)

    expect(membership.status).toBe("ACTIVE")
    expect(membership.currentPeriodEndsAt).toStrictEqual(
      new Date("2026-05-19T00:00:00.000Z")
    )
    expect(payments[0]?.dueAt).toStrictEqual(
      new Date("2026-04-19T00:00:00.000Z")
    )
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("backdating an expired renewal changes the period basis but not due date", async () => {
  const fixture = await createRenewalFixture({
    membershipStatus: "ACTIVE",
    currentPeriodEndsAt: new Date("2026-03-01T00:00:00.000Z"),
  })

  try {
    await renewMembershipForGym({
      client: db,
      gymId: fixture.gymId,
      timezone: "UTC",
      membershipId: fixture.membershipId,
      expectedStatus: "ACTIVE",
      expectedCurrentPeriodEndsAt: new Date("2026-03-01T00:00:00.000Z"),
      submissionId: "a5ea1ff5-930c-4c68-b3a4-d1f1dd4bbd99",
      renewalDate: new Date("2026-04-05T00:00:00.000Z"),
      now: new Date("2026-04-19T10:00:00.000Z"),
    })

    const membership = await getMembership(fixture.membershipId)
    const payments = await getRenewalPayments(fixture.membershipId)

    expect(membership.currentPeriodEndsAt).toStrictEqual(
      new Date("2026-05-05T00:00:00.000Z")
    )
    expect(payments[0]?.dueAt).toStrictEqual(
      new Date("2026-04-19T00:00:00.000Z")
    )
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("retrying the same renewal submission is idempotent", async () => {
  const fixture = await createRenewalFixture({
    membershipStatus: "EXPIRED",
    currentPeriodEndsAt: new Date("2026-03-01T00:00:00.000Z"),
  })
  const submissionId = "801999d7-f50b-4a73-9184-9a7c81c87f51"
  const values = {
    client: db,
    gymId: fixture.gymId,
    timezone: "UTC",
    membershipId: fixture.membershipId,
    expectedStatus: "EXPIRED" as const,
    expectedCurrentPeriodEndsAt: new Date("2026-03-01T00:00:00.000Z"),
    submissionId,
    now: new Date("2026-04-19T10:00:00.000Z"),
  }

  try {
    expect((await renewMembershipForGym(values)).status).toBe("renewed")
    expect(await renewMembershipForGym(values)).toStrictEqual({
      status: "already-renewed",
      memberId: fixture.memberId,
    })

    const membership = await getMembership(fixture.membershipId)
    const payments = await getRenewalPayments(fixture.membershipId)

    expect(membership.currentPeriodEndsAt).toStrictEqual(
      new Date("2026-05-19T00:00:00.000Z")
    )
    expect(payments.length).toBe(1)
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("stale renewal submissions return conflict", async () => {
  const fixture = await createRenewalFixture({
    membershipStatus: "ACTIVE",
    currentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
  })

  try {
    expect(
      await renewMembershipForGym({
        client: db,
        gymId: fixture.gymId,
        timezone: "UTC",
        membershipId: fixture.membershipId,
        expectedStatus: "ACTIVE",
        expectedCurrentPeriodEndsAt: new Date("2026-04-24T00:00:00.000Z"),
        submissionId: "eff02b26-23b0-4503-bf50-d71184700c0a",
        now: new Date("2026-04-19T10:00:00.000Z"),
      })
    ).toStrictEqual({ status: "conflict" })
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("concurrent renewals produce one success and one conflict", async () => {
  const fixture = await createRenewalFixture({
    membershipStatus: "ACTIVE",
    currentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
  })
  const values = {
    client: db,
    gymId: fixture.gymId,
    timezone: "UTC",
    membershipId: fixture.membershipId,
    expectedStatus: "ACTIVE" as const,
    expectedCurrentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
    now: new Date("2026-04-19T10:00:00.000Z"),
  }

  try {
    const results = await Promise.all([
      renewMembershipForGym({
        ...values,
        submissionId: "336e26d2-e80f-4f9a-b66c-ea8f8ae1b6f9",
      }),
      renewMembershipForGym({
        ...values,
        submissionId: "ef91c55e-62f4-4275-bdd3-3a9ca41daf39",
      }),
    ])
    const statuses = results.map((result) => result.status).sort()
    const payments = await getRenewalPayments(fixture.membershipId)

    expect(statuses).toStrictEqual(["conflict", "renewed"])
    expect(payments.length).toBe(1)
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("renewing an expired membership returns it to current MRR", async () => {
  const fixture = await createRenewalFixture({
    membershipStatus: "ACTIVE",
    currentPeriodEndsAt: new Date("2026-03-01T00:00:00.000Z"),
  })
  const revenueAsOf = new Date("2026-04-19T00:00:00.000Z")

  try {
    expect(
      await getMembershipMrr(
        fixture.gymId,
        revenueAsOf,
        db as unknown as DashboardDb
      )
    ).toBe(0)

    await renewMembershipForGym({
      client: db,
      gymId: fixture.gymId,
      timezone: "UTC",
      membershipId: fixture.membershipId,
      expectedStatus: "ACTIVE",
      expectedCurrentPeriodEndsAt: new Date("2026-03-01T00:00:00.000Z"),
      submissionId: "5c44f82b-ee48-4a78-932a-e1147474c548",
      now: new Date("2026-04-19T10:00:00.000Z"),
    })

    expect(
      await getMembershipMrr(
        fixture.gymId,
        revenueAsOf,
        db as unknown as DashboardDb
      )
    ).toBe(650000)
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("renewal rejects non-renewable, suspended, future-date, and cross-gym requests", async () => {
  const fixture = await createRenewalFixture({
    membershipStatus: "PAST_DUE",
    currentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
  })
  const canceledFixture = await createRenewalFixture({
    membershipStatus: "CANCELED",
    currentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
  })
  const suspendedFixture = await createRenewalFixture({
    memberStatus: "SUSPENDED",
    membershipStatus: "ACTIVE",
    currentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
  })

  try {
    expect(
      (
        await renewMembershipForGym({
          client: db,
          gymId: fixture.gymId,
          timezone: "UTC",
          membershipId: fixture.membershipId,
          expectedStatus: "ACTIVE",
          expectedCurrentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
          submissionId: "0a1f4445-b4ba-4438-bb38-4cde0f34b679",
          now: new Date("2026-04-19T10:00:00.000Z"),
        })
      ).status
    ).toBe("not-renewable")
    expect(
      (
        await renewMembershipForGym({
          client: db,
          gymId: canceledFixture.gymId,
          timezone: "UTC",
          membershipId: canceledFixture.membershipId,
          expectedStatus: "ACTIVE",
          expectedCurrentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
          submissionId: "c9d9f334-e4c2-41ac-afb3-50f11cce69a9",
          now: new Date("2026-04-19T10:00:00.000Z"),
        })
      ).status
    ).toBe("not-renewable")
    expect(
      (
        await renewMembershipForGym({
          client: db,
          gymId: suspendedFixture.gymId,
          timezone: "UTC",
          membershipId: suspendedFixture.membershipId,
          expectedStatus: "ACTIVE",
          expectedCurrentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
          submissionId: "092820af-9c08-412b-b60e-e054fb9198eb",
          now: new Date("2026-04-19T10:00:00.000Z"),
        })
      ).status
    ).toBe("member-suspended")
    expect(
      (
        await renewMembershipForGym({
          client: db,
          gymId: suspendedFixture.gymId,
          timezone: "UTC",
          membershipId: fixture.membershipId,
          expectedStatus: "ACTIVE",
          expectedCurrentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
          submissionId: "f5b8eb35-42ec-48c7-bceb-41b3888e13f4",
          now: new Date("2026-04-19T10:00:00.000Z"),
        })
      ).status
    ).toBe("not-found")
    expect(
      (
        await renewMembershipForGym({
          client: db,
          gymId: suspendedFixture.gymId,
          timezone: "UTC",
          membershipId: suspendedFixture.membershipId,
          expectedStatus: "ACTIVE",
          expectedCurrentPeriodEndsAt: new Date("2026-04-25T00:00:00.000Z"),
          submissionId: "191afefe-6845-4841-9443-0605fcb64dc4",
          renewalDate: new Date("2026-04-20T00:00:00.000Z"),
          now: new Date("2026-04-19T10:00:00.000Z"),
        })
      ).status
    ).toBe("future-renewal-date")
  } finally {
    await deleteFixture(fixture.userId)
    await deleteFixture(canceledFixture.userId)
    await deleteFixture(suspendedFixture.userId)
  }
})

type FixtureOptions = {
  memberStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  membershipStatus: "ACTIVE" | "EXPIRED" | "PAST_DUE" | "CANCELED"
  currentPeriodEndsAt: Date
}

async function createRenewalFixture(options: FixtureOptions) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const userId = `test-renewal-owner-${suffix}`
  const startedAt = new Date("2026-02-01T00:00:00.000Z")

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: userId,
        name: "Renewal Owner",
        email: `renewal-${suffix}@example.test`,
        emailVerified: true,
      },
      select: { id: true },
    })
    const gym = await tx.gym.create({
      data: {
        ownerId: user.id,
        name: `Renewal Gym ${suffix}`,
        timezone: "UTC",
        currencyCode: "IDR",
        defaultDropInFeeAmount: 75000,
      },
      select: { id: true },
    })
    const planName = `Renewal Plan ${suffix}`
    const plan = await tx.planTier.create({
      data: {
        gymId: gym.id,
        name: planName,
        normalizedName: planName.trim().toLowerCase(),
        monthlyPriceAmount: 650000,
        annualPriceAmount: 6500000,
        sortOrder: 1,
      },
      select: { id: true },
    })
    const member = await tx.member.create({
      data: {
        gymId: gym.id,
        firstName: "Renewal",
        lastName: "Member",
        status: options.memberStatus ?? "ACTIVE",
        joinDate: startedAt,
      },
      select: { id: true },
    })
    const membership = await tx.membership.create({
      data: {
        memberId: member.id,
        planTierId: plan.id,
        billingInterval: "MONTHLY",
        status: options.membershipStatus,
        priceAmount: 650000,
        startedAt,
        currentPeriodEndsAt: options.currentPeriodEndsAt,
        nextBillingDate: options.currentPeriodEndsAt,
      },
      select: { id: true },
    })

    return {
      userId: user.id,
      gymId: gym.id,
      memberId: member.id,
      membershipId: membership.id,
      startedAt,
    }
  })

  return result
}

async function getMembership(membershipId: string) {
  return db.membership.findUniqueOrThrow({
    where: { id: membershipId },
    select: {
      status: true,
      startedAt: true,
      currentPeriodEndsAt: true,
      nextBillingDate: true,
    },
  })
}

async function getRenewalPayments(membershipId: string) {
  return db.membershipPayment.findMany({
    where: {
      membershipId,
      notes: { contains: "Renewal submission:" },
    },
    select: { amount: true, status: true, dueAt: true, notes: true },
    orderBy: { createdAt: "asc" },
  })
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
