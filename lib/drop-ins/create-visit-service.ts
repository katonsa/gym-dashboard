import type { PrismaClient } from "@/lib/generated/prisma/client"
import {
  normalizeCreateDropInValues,
  type CreateDropInValues,
} from "@/lib/drop-ins/schemas/create-drop-in-schema"
import { normalizeDropInVisitorContact } from "@/lib/drop-ins/visitor-contact"

type CreateDropInVisitDb = Pick<PrismaClient, "dropInVisit">

export async function createDropInVisitForGym({
  client,
  gymId,
  defaultAmount,
  values,
}: {
  client: CreateDropInVisitDb
  gymId: string
  defaultAmount: number | undefined
  values: CreateDropInValues
}) {
  const dropInValues = normalizeCreateDropInValues(values)

  if (defaultAmount === undefined) {
    throw new Error("Default drop-in amount was not selected.")
  }

  await client.dropInVisit.create({
    data: {
      gymId,
      visitorName: dropInValues.visitorName,
      visitorContact: dropInValues.visitorContact,
      normalizedVisitorContact: normalizeDropInVisitorContact(
        dropInValues.visitorContact
      ),
      visitCount: dropInValues.visitCount,
      amount: dropInValues.amount ?? defaultAmount,
      notes: dropInValues.notes,
    },
  })
}
