import assert from "node:assert/strict"
import test from "node:test"

import { logMemberCheckInForGym } from "../lib/dashboard/attendance-lifecycle.ts"
import { db } from "../lib/db.ts"

test("manual check-in creates attendance and updates newer last attendance", async () => {
  const fixture = await createAttendanceFixture({
    lastAttendedAt: new Date("2026-04-10T00:00:00.000Z"),
  })
  const attendedAt = new Date("2026-04-18T00:00:00.000Z")

  try {
    assert.deepEqual(
      await logMemberCheckInForGym({
        client: db,
        gymId: fixture.gymId,
        memberId: fixture.memberId,
        attendedAt,
        notes: "Manual desk check-in.",
      }),
      { status: "logged", memberId: fixture.memberId }
    )

    const attendance = await db.attendanceRecord.findFirstOrThrow({
      where: { memberId: fixture.memberId },
      select: { attendedAt: true, source: true, notes: true },
    })
    const member = await db.member.findUniqueOrThrow({
      where: { id: fixture.memberId },
      select: { lastAttendedAt: true },
    })

    assert.deepEqual(attendance.attendedAt, attendedAt)
    assert.equal(attendance.source, "MANUAL")
    assert.equal(attendance.notes, "Manual desk check-in.")
    assert.deepEqual(member.lastAttendedAt, attendedAt)
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("manual check-in keeps last attendance when the date is older", async () => {
  const existingLastAttendedAt = new Date("2026-04-18T00:00:00.000Z")
  const fixture = await createAttendanceFixture({
    lastAttendedAt: existingLastAttendedAt,
  })

  try {
    assert.deepEqual(
      await logMemberCheckInForGym({
        client: db,
        gymId: fixture.gymId,
        memberId: fixture.memberId,
        attendedAt: new Date("2026-04-10T00:00:00.000Z"),
      }),
      { status: "logged", memberId: fixture.memberId }
    )

    const member = await db.member.findUniqueOrThrow({
      where: { id: fixture.memberId },
      select: { lastAttendedAt: true },
    })

    assert.deepEqual(member.lastAttendedAt, existingLastAttendedAt)
  } finally {
    await deleteFixture(fixture.userId)
  }
})

test("manual check-in rejects members from another gym", async () => {
  const fixture = await createAttendanceFixture({})
  const otherFixture = await createAttendanceFixture({})

  try {
    assert.deepEqual(
      await logMemberCheckInForGym({
        client: db,
        gymId: fixture.gymId,
        memberId: otherFixture.memberId,
        attendedAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      { status: "not-found" }
    )

    assert.equal(
      await db.attendanceRecord.count({
        where: { memberId: otherFixture.memberId },
      }),
      0
    )
  } finally {
    await deleteFixture(fixture.userId)
    await deleteFixture(otherFixture.userId)
  }
})

type FixtureOptions = {
  lastAttendedAt?: Date
}

async function createAttendanceFixture(options: FixtureOptions) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const userId = `test-attendance-owner-${suffix}`

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: userId,
        name: "Attendance Owner",
        email: `attendance-${suffix}@example.test`,
        emailVerified: true,
      },
      select: { id: true },
    })
    const gym = await tx.gym.create({
      data: {
        ownerId: user.id,
        name: `Attendance Gym ${suffix}`,
        timezone: "UTC",
        currencyCode: "IDR",
        defaultDropInFeeAmount: 75000,
      },
      select: { id: true },
    })
    const member = await tx.member.create({
      data: {
        gymId: gym.id,
        firstName: "Attendance",
        lastName: "Member",
        status: "ACTIVE",
        joinDate: new Date("2026-03-01T00:00:00.000Z"),
        lastAttendedAt: options.lastAttendedAt,
      },
      select: { id: true },
    })

    return {
      userId: user.id,
      gymId: gym.id,
      memberId: member.id,
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
