import type { PrismaClient } from "../generated/prisma/client.ts"

type MemberContactLifecycleDb = Pick<PrismaClient, "$transaction">

type UpdateMemberContactResult =
  | { status: "updated"; memberId: string }
  | { status: "not-found" }

export async function updateMemberContactForGym({
  client,
  gymId,
  memberId,
  firstName,
  lastName,
  email,
  phone,
  notes,
}: {
  client: MemberContactLifecycleDb
  gymId: string
  memberId: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  notes: string | null
}): Promise<UpdateMemberContactResult> {
  return client.$transaction(async (tx) => {
    const member = await tx.member.findFirst({
      where: {
        id: memberId,
        gymId,
      },
      select: { id: true },
    })

    if (!member) {
      return { status: "not-found" }
    }

    await tx.member.update({
      where: { id: member.id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        notes,
      },
      select: { id: true },
    })

    return { status: "updated", memberId: member.id }
  })
}
