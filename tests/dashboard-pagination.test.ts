import { expect, test } from "vitest"

import {
  getPrismaOffsetArgs,
  parsePaginationParams,
} from "../lib/dashboard/pagination.ts"

test("parses a valid page value from search params", async () => {
  expect(
    await parsePaginationParams(Promise.resolve({ page: "3" }))
  ).toStrictEqual({
    page: 3,
    pageSize: 25,
  })
})

test("clamps invalid and array page values to sane defaults", async () => {
  expect(
    await parsePaginationParams(Promise.resolve({ page: ["0", "4"] }))
  ).toStrictEqual({
    page: 1,
    pageSize: 25,
  })

  expect(
    await parsePaginationParams(Promise.resolve({ page: "-10" }), {
      page: 2,
      pageSize: 50,
    })
  ).toStrictEqual({
    page: 2,
    pageSize: 50,
  })
})

test("supports custom page param names", async () => {
  expect(
    await parsePaginationParams(Promise.resolve({ ap: "4" }), {
      pageParam: "ap",
      pageSize: 20,
    })
  ).toStrictEqual({
    page: 4,
    pageSize: 20,
  })
})

test("builds prisma skip and take values from pagination params", () => {
  expect(
    getPrismaOffsetArgs({
      page: 3,
      pageSize: 25,
    })
  ).toStrictEqual({
    skip: 50,
    take: 25,
  })
})
