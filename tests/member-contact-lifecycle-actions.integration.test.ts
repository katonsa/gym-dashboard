import assert from "node:assert/strict"
import test from "node:test"

import { updateMemberContactForGym } from "../app/(dashboard)/members/member-contact-lifecycle.ts"
import { db } from "../lib/db.ts"

test("updating member contact changes scoped member fields", async () => {
  const fixture = await createMemberContactFixture()

  try {
    assert.deepEqual(
      await updateMemberContactForGym({
        client: db,
        gymId: fixture.gymId,
        memberId: fixture.memberId,
        firstName: "Updated",
        lastName: "Member",
        email: null,
        phone: null,
        notes: null,
      }),
      { status: "updated", memberId: fixture.memberId }
    )

    const member = await db.member.findUniqueOrThrow({
      where: { id: fixture.memberId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        notes: true,
      },
    })

    assert.deepEqual(member, {
      firstName: "Updated",
      lastName: "Member",
      email: null,
      phone: null,
      notes: null,
    })
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("updating member contact rejects members from another gym", async () => {
  const fixture = await createMemberContactFixture()
  const otherFixture = await createMemberContactFixture()

  try {
    assert.deepEqual(
      await updateMemberContactForGym({
        client: db,
        gymId: fixture.gymId,
        memberId: otherFixture.memberId,
        firstName: "Wrong",
        lastName: "Gym",
        email: null,
        phone: null,
        notes: null,
      }),
      { status: "not-found" }
    )

    const member = await db.member.findUniqueOrThrow({
      where: { id: otherFixture.memberId },
      select: { firstName: true, lastName: true },
    })

    assert.deepEqual(member, {
      firstName: "Original",
      lastName: "Member",
    })
  } finally {
    await deleteFixture(fixture.userId)
    await deleteFixture(otherFixture.userId)
  }
})

async function createMemberContactFixture() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const userId = `test-member-contact-owner-${suffix}`

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: userId,
        name: "Member Contact Owner",
        email: `member-contact-${suffix}@example.test`,
        emailVerified: true,
      },
      select: { id: true },
    })
    const gym = await tx.gym.create({
      data: {
        ownerId: user.id,
        name: `Member Contact Gym ${suffix}`,
        timezone: "UTC",
        currencyCode: "IDR",
        defaultDropInFeeAmount: 75000,
      },
      select: { id: true },
    })
    const member = await tx.member.create({
      data: {
        gymId: gym.id,
        firstName: "Original",
        lastName: "Member",
        email: "original@example.test",
        phone: "+62 812 5555",
        status: "ACTIVE",
        joinDate: new Date("2026-03-01T00:00:00.000Z"),
        notes: "Original notes.",
      },
      select: { id: true },
    })

    return {
      userId: user.id,
      gymId: gym.id,
      memberId: member.id,
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
