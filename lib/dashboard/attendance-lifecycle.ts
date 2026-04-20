import type { PrismaClient } from "../generated/prisma/client.ts"

type AttendanceLifecycleDb = Pick<PrismaClient, "$transaction">

type LogMemberCheckInResult =
  | { status: "logged"; memberId: string }
  | { status: "not-found" }

export async function logMemberCheckInForGym({
  client,
  gymId,
  memberId,
  attendedAt,
  notes,
}: {
  client: AttendanceLifecycleDb
  gymId: string
  memberId: string
  attendedAt: Date
  notes?: string
}): Promise<LogMemberCheckInResult> {
  return client.$transaction(async (tx) => {
    const member = await tx.member.findFirst({
      where: {
        id: memberId,
        gymId,
      },
      select: {
        id: true,
        lastAttendedAt: true,
      },
    })

    if (!member) {
      return { status: "not-found" }
    }

    await tx.attendanceRecord.create({
      data: {
        gymId,
        memberId: member.id,
        attendedAt,
        source: "MANUAL",
        notes,
      },
      select: { id: true },
    })

    if (!member.lastAttendedAt || attendedAt > member.lastAttendedAt) {
      await tx.member.update({
        where: { id: member.id },
        data: { lastAttendedAt: attendedAt },
        select: { id: true },
      })
    }

    return { status: "logged", memberId: member.id }
  })
}
