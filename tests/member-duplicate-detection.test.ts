import { expect, test } from "vitest"

import {
  findPotentialMemberDuplicatesForGym,
  getMemberDuplicateReasons,
  isSimilarMemberName,
} from "../lib/members/duplicate-detection.ts"

const input = {
  firstName: "Ari",
  lastName: "Santoso",
  email: "ari@example.test",
  phone: "+62 812 5555",
}

test("detects email matches case-insensitively", () => {
  expect(
    getMemberDuplicateReasons(input, {
      firstName: "Different",
      lastName: "Member",
      email: " ARI@example.test ",
      phone: null,
    })
  ).toContain("email")
})

test("detects phone matches after stripping formatting", () => {
  expect(
    getMemberDuplicateReasons(input, {
      firstName: "Different",
      lastName: "Member",
      email: null,
      phone: "62 812-5555",
    })
  ).toContain("phone")
})

test("detects exact, swapped, initial, and typo name matches", () => {
  expect(isSimilarMemberName(input, name("Ari", "Santoso"))).toBe(true)
  expect(isSimilarMemberName(input, name("Santoso", "Ari"))).toBe(true)
  expect(isSimilarMemberName(input, name("A.", "Santoso"))).toBe(true)
  expect(isSimilarMemberName(input, name("Ary", "Santoso"))).toBe(true)
  expect(isSimilarMemberName(input, name("Ari", "Santosa"))).toBe(true)
})

test("does not warn on unrelated full names with the same initial", () => {
  expect(isSimilarMemberName(input, name("Agus", "Santoso"))).toBe(false)
  expect(isSimilarMemberName(input, name("Ari", "Setiawan"))).toBe(false)
})

test("returns multiple reasons for one matching member", () => {
  expect(
    getMemberDuplicateReasons(input, {
      firstName: "A.",
      lastName: "Santoso",
      email: "ARI@example.test",
      phone: "62-812-5555",
    })
  ).toStrictEqual(["email", "phone", "similar-name"])
})

test("loads same-gym candidates and maps duplicate matches", async () => {
  const calls: unknown[] = []
  const client = {
    member: {
      findMany: async (args: unknown) => {
        calls.push(args)

        return [
          {
            id: "member-1",
            firstName: "Ari",
            lastName: "Santoso",
            email: "ari@example.test",
            phone: null,
            status: "ACTIVE" as const,
          },
          {
            id: "member-2",
            firstName: "Maya",
            lastName: "Putri",
            email: "maya@example.test",
            phone: "+62 812 9999",
            status: "INACTIVE" as const,
          },
        ]
      },
    },
  }

  await expect(
    findPotentialMemberDuplicatesForGym({
      client,
      gymId: "gym-1",
      input,
    })
  ).resolves.toStrictEqual([
    {
      id: "member-1",
      firstName: "Ari",
      lastName: "Santoso",
      email: "ari@example.test",
      status: "ACTIVE",
      reasons: ["email", "similar-name"],
    },
  ])

  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({
    where: { gymId: "gym-1" },
  })
})

function name(firstName: string, lastName: string) {
  return {
    firstName,
    lastName,
    email: null,
    phone: null,
  }
}
