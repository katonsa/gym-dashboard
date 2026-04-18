import assert from "node:assert/strict"
import test from "node:test"

import {
  getPrismaOffsetArgs,
  parsePaginationParams,
} from "../lib/dashboard/pagination.ts"

test("parses a valid page value from search params", async () => {
  assert.deepEqual(
    await parsePaginationParams(Promise.resolve({ page: "3" })),
    {
      page: 3,
      pageSize: 25,
    }
  )
})

test("clamps invalid and array page values to sane defaults", async () => {
  assert.deepEqual(
    await parsePaginationParams(Promise.resolve({ page: ["0", "4"] })),
    {
      page: 1,
      pageSize: 25,
    }
  )

  assert.deepEqual(
    await parsePaginationParams(Promise.resolve({ page: "-10" }), {
      page: 2,
      pageSize: 50,
    }),
    {
      page: 2,
      pageSize: 50,
    }
  )
})

test("supports custom page param names", async () => {
  assert.deepEqual(
    await parsePaginationParams(Promise.resolve({ ap: "4" }), {
      pageParam: "ap",
      pageSize: 20,
    }),
    {
      page: 4,
      pageSize: 20,
    }
  )
})

test("builds prisma skip and take values from pagination params", () => {
  assert.deepEqual(
    getPrismaOffsetArgs({
      page: 3,
      pageSize: 25,
    }),
    {
      skip: 50,
      take: 25,
    }
  )
})
