import assert from "node:assert/strict"
import test from "node:test"

import {
  createPlanTierForGym,
  deactivatePlanTierForGym,
  getPlanTierManagementRows,
  normalizePlanTierName,
  updatePlanTierForGym,
} from "../lib/dashboard/plan-tier-management.ts"
import { db } from "../lib/db.ts"

const planValues = {
  name: "Pro",
  description: "Open gym plus weekly group programming.",
  monthlyPriceAmount: "650000",
  annualPriceAmount: "6500000",
  sortOrder: "2",
  isActive: true,
}

test("creating plan tiers is scoped and rejects duplicate names", async () => {
  const fixture = await createPlanTierFixture()

  try {
    const created = await createPlanTierForGym({
      client: db,
      gymId: fixture.gymId,
      values: planValues,
    })

    assert.equal(created.status, "created")
    assert.deepEqual(
      await createPlanTierForGym({
        client: db,
        gymId: fixture.gymId,
        values: {
          ...planValues,
          name: "pro",
          sortOrder: "3",
        },
      }),
      { status: "duplicate-name" }
    )
    await assert.rejects(
      () =>
        db.planTier.create({
          data: {
            gymId: fixture.gymId,
            name: "PRO",
            normalizedName: normalizePlanTierName("PRO"),
            monthlyPriceAmount: 650000,
            annualPriceAmount: 6500000,
            sortOrder: 3,
          },
          select: { id: true },
        }),
      isUniqueConstraintError
    )

    const rows = await getPlanTierManagementRows(fixture.gymId, db)
    assert.equal(rows.length, 1)
    assert.equal(rows[0]?.name, "Pro")
    assert.equal(rows[0]?.isActive, true)
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("updating plan tiers rejects cross-gym writes and duplicates", async () => {
  const fixture = await createPlanTierFixture()
  const otherFixture = await createPlanTierFixture()

  try {
    const basic = await db.planTier.create({
      data: {
        gymId: fixture.gymId,
        name: "Basic",
        normalizedName: normalizePlanTierName("Basic"),
        monthlyPriceAmount: 350000,
        annualPriceAmount: 3500000,
        sortOrder: 1,
      },
      select: { id: true },
    })
    const pro = await db.planTier.create({
      data: {
        gymId: fixture.gymId,
        name: "Pro",
        normalizedName: normalizePlanTierName("Pro"),
        monthlyPriceAmount: 650000,
        annualPriceAmount: 6500000,
        sortOrder: 2,
      },
      select: { id: true },
    })
    const otherPlan = await db.planTier.create({
      data: {
        gymId: otherFixture.gymId,
        name: "Other",
        normalizedName: normalizePlanTierName("Other"),
        monthlyPriceAmount: 100000,
        annualPriceAmount: 1000000,
        sortOrder: 1,
      },
      select: { id: true },
    })

    assert.deepEqual(
      await updatePlanTierForGym({
        client: db,
        gymId: fixture.gymId,
        planTierId: otherPlan.id,
        values: {
          ...planValues,
          name: "Wrong Gym",
        },
      }),
      { status: "not-found" }
    )
    assert.deepEqual(
      await updatePlanTierForGym({
        client: db,
        gymId: fixture.gymId,
        planTierId: pro.id,
        values: {
          ...planValues,
          name: "basic",
        },
      }),
      { status: "duplicate-name" }
    )

    const updated = await updatePlanTierForGym({
      client: db,
      gymId: fixture.gymId,
      planTierId: basic.id,
      values: {
        ...planValues,
        name: "Starter",
        monthlyPriceAmount: "400000",
      },
    })

    assert.equal(updated.status, "updated")
    const afterUpdate = await db.planTier.findUniqueOrThrow({
      where: { id: basic.id },
      select: { name: true, monthlyPriceAmount: true },
    })
    assert.equal(afterUpdate.name, "Starter")
    assert.equal(afterUpdate.monthlyPriceAmount, 400000)
  } finally {
    await deleteFixture(fixture.userId)
    await deleteFixture(otherFixture.userId)
  }
})

test("deactivating a plan hides it without changing memberships", async () => {
  const fixture = await createPlanTierFixture()

  try {
    const plan = await db.planTier.create({
      data: {
        gymId: fixture.gymId,
        name: "Elite",
        normalizedName: normalizePlanTierName("Elite"),
        monthlyPriceAmount: 950000,
        annualPriceAmount: 9500000,
        sortOrder: 3,
      },
      select: { id: true },
    })
    const member = await db.member.create({
      data: {
        gymId: fixture.gymId,
        firstName: "Active",
        lastName: "Member",
        status: "ACTIVE",
        joinDate: new Date("2026-03-01T00:00:00.000Z"),
      },
      select: { id: true },
    })
    const membership = await db.membership.create({
      data: {
        memberId: member.id,
        planTierId: plan.id,
        billingInterval: "MONTHLY",
        status: "ACTIVE",
        priceAmount: 950000,
        startedAt: new Date("2026-03-01T00:00:00.000Z"),
        currentPeriodEndsAt: new Date("2026-04-01T00:00:00.000Z"),
        nextBillingDate: new Date("2026-04-01T00:00:00.000Z"),
      },
      select: { id: true },
    })

    const rowsBefore = await getPlanTierManagementRows(fixture.gymId, db)
    assert.equal(rowsBefore[0]?.activeMembershipsCount, 1)

    assert.deepEqual(
      await deactivatePlanTierForGym({
        client: db,
        gymId: fixture.gymId,
        planTierId: plan.id,
      }),
      { status: "deactivated", planTierId: plan.id }
    )

    const [planAfter, membershipAfter] = await Promise.all([
      db.planTier.findUniqueOrThrow({
        where: { id: plan.id },
        select: { isActive: true },
      }),
      db.membership.findUniqueOrThrow({
        where: { id: membership.id },
        select: { status: true, planTierId: true },
      }),
    ])

    assert.equal(planAfter.isActive, false)
    assert.deepEqual(membershipAfter, {
      status: "ACTIVE",
      planTierId: plan.id,
    })
  } finally {
    await deleteFixture(fixture.userId)
  }
})

async function createPlanTierFixture() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const userId = `test-plan-tier-owner-${suffix}`

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: userId,
        name: "Plan Tier Owner",
        email: `plan-tier-${suffix}@example.test`,
        emailVerified: true,
      },
      select: { id: true },
    })
    const gym = await tx.gym.create({
      data: {
        ownerId: user.id,
        name: `Plan Tier Gym ${suffix}`,
        timezone: "UTC",
        currencyCode: "IDR",
        defaultDropInFeeAmount: 75000,
      },
      select: { id: true },
    })

    return {
      userId: user.id,
      gymId: gym.id,
    }
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

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  )
}
