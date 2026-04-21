import { expect, test } from "vitest"

import {
  getDashboardSignInPath,
  getSafeDashboardNextPath,
} from "../lib/auth/next-path.ts"

test("allows known dashboard routes as safe return paths", () => {
  expect(getSafeDashboardNextPath("/")).toBe("/")
  expect(getSafeDashboardNextPath("/members")).toBe("/members")
  expect(getSafeDashboardNextPath("/drop-ins?source=nav#entry")).toBe(
    "/drop-ins?source=nav#entry"
  )
  expect(getSafeDashboardNextPath("/settings")).toBe("/settings")
})

test("falls back for external, protocol-relative, and unknown return paths", () => {
  expect(getSafeDashboardNextPath("https://example.com")).toBe("/")
  expect(getSafeDashboardNextPath("//example.com")).toBe("/")
  expect(getSafeDashboardNextPath("/unknown")).toBe("/")
  expect(getSafeDashboardNextPath(undefined)).toBe("/")
})

test("builds sign-in paths with encoded safe dashboard next params", () => {
  expect(getDashboardSignInPath("/members?status=ACTIVE")).toBe(
    "/sign-in?next=%2Fmembers%3Fstatus%3DACTIVE"
  )
  expect(getDashboardSignInPath("https://example.com")).toBe(
    "/sign-in?next=%2F"
  )
})
