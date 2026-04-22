import type { PrismaClient } from "@/lib/generated/prisma/client"

type MemberStatusDb = Pick<PrismaClient, "$transaction">
type UpdateMemberStatusValues = {
  memberId: string
  status: "ACTIVE" | "SUSPENDED"
}

export type UpdateMemberStatusForGymResult =
  | { status: "updated" }
  | { status: "not-found" }

export async function updateMemberStatusForGym({
  client,
  gymId,
  values,
}: {
  client: MemberStatusDb
  gymId: string
  values: UpdateMemberStatusValues
}): Promise<UpdateMemberStatusForGymResult> {
  const result = await client.$transaction(async (tx) => {
    const member = await tx.member.findFirst({
      where: {
        id: values.memberId,
        gymId,
      },
      select: { id: true },
    })

    if (!member) {
      return { found: false }
    }

    await tx.member.update({
      where: { id: member.id },
      data: { status: values.status },
      select: { id: true },
    })

    if (values.status === "SUSPENDED") {
      await tx.membership.updateMany({
        where: {
          memberId: member.id,
          status: "ACTIVE",
        },
        data: { status: "PAST_DUE" },
      })
    }

    return { found: true }
  })

  return result.found ? { status: "updated" } : { status: "not-found" }
}
