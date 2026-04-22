import type { MemberStatus } from "@/lib/domain/types"

export type MemberDuplicateReason = "email" | "phone" | "similar-name"

export type MemberDuplicateInput = {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
}

export type MemberDuplicateMatch = {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  status: MemberStatus
  reasons: MemberDuplicateReason[]
}

type MemberDuplicateRow = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  status: MemberStatus
}

type MemberDuplicateClient = {
  member: {
    findMany: (args: {
      where: { gymId: string }
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }]
      select: {
        id: true
        firstName: true
        lastName: true
        email: true
        phone: true
        status: true
      }
    }) => Promise<MemberDuplicateRow[]>
  }
}

export async function findPotentialMemberDuplicatesForGym({
  client,
  gymId,
  input,
}: {
  client: MemberDuplicateClient
  gymId: string
  input: MemberDuplicateInput
}): Promise<MemberDuplicateMatch[]> {
  const members = await client.member.findMany({
    where: { gymId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  })

  return members
    .map((member) => {
      const reasons = getMemberDuplicateReasons(input, member)

      if (reasons.length === 0) {
        return null
      }

      const match: MemberDuplicateMatch = {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        status: member.status,
        reasons,
      }

      if (member.email) {
        match.email = member.email
      }

      if (member.phone) {
        match.phone = member.phone
      }

      return match
    })
    .filter((match): match is MemberDuplicateMatch => match !== null)
}

export function getMemberDuplicateReasons(
  input: MemberDuplicateInput,
  member: MemberDuplicateInput
): MemberDuplicateReason[] {
  const reasons: MemberDuplicateReason[] = []

  if (isMatchingEmail(input.email, member.email)) {
    reasons.push("email")
  }

  if (isMatchingPhone(input.phone, member.phone)) {
    reasons.push("phone")
  }

  if (isSimilarMemberName(input, member)) {
    reasons.push("similar-name")
  }

  return reasons
}

export function isMatchingEmail(
  left: string | null | undefined,
  right: string | null | undefined
) {
  const normalizedLeft = normalizeEmail(left)
  const normalizedRight = normalizeEmail(right)

  return (
    normalizedLeft.length > 0 &&
    normalizedRight.length > 0 &&
    normalizedLeft === normalizedRight
  )
}

export function isMatchingPhone(
  left: string | null | undefined,
  right: string | null | undefined
) {
  const normalizedLeft = normalizePhone(left)
  const normalizedRight = normalizePhone(right)

  return (
    normalizedLeft.length > 0 &&
    normalizedRight.length > 0 &&
    normalizedLeft === normalizedRight
  )
}

export function isSimilarMemberName(
  input: MemberDuplicateInput,
  member: MemberDuplicateInput
) {
  const inputFirst = normalizeNamePart(input.firstName)
  const inputLast = normalizeNamePart(input.lastName)
  const memberFirst = normalizeNamePart(member.firstName)
  const memberLast = normalizeNamePart(member.lastName)

  if (!inputFirst || !inputLast || !memberFirst || !memberLast) {
    return false
  }

  if (inputFirst === memberFirst && inputLast === memberLast) {
    return true
  }

  if (inputFirst === memberLast && inputLast === memberFirst) {
    return true
  }

  if (
    namesMatchConservatively(inputFirst, memberFirst) &&
    namesMatchConservatively(inputLast, memberLast)
  ) {
    return true
  }

  return false
}

function namesMatchConservatively(left: string, right: string) {
  if (left === right) {
    return true
  }

  if (isInitialMatch(left, right)) {
    return true
  }

  if (left.length < 3 || right.length < 3) {
    return false
  }

  return levenshteinDistance(left, right) <= 1
}

function isInitialMatch(left: string, right: string) {
  return (
    (left.length === 1 && right.length > 1 && right.startsWith(left)) ||
    (right.length === 1 && left.length > 1 && left.startsWith(right))
  )
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? ""
}

function normalizeNamePart(value: string | null | undefined) {
  return (
    value
      ?.normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "")
      .toLowerCase() ?? ""
  )
}

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  const current = Array.from({ length: right.length + 1 }, () => 0)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1

      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost
      )
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index] ?? 0
    }
  }

  return previous[right.length] ?? 0
}
