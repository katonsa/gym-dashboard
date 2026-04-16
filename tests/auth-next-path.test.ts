import assert from "node:assert/strict"
import test from "node:test"

import {
  getDashboardSignInPath,
  getSafeDashboardNextPath,
} from "../lib/auth/next-path.ts"

test("allows known dashboard routes as safe return paths", () => {
  assert.equal(getSafeDashboardNextPath("/"), "/")
  assert.equal(getSafeDashboardNextPath("/members"), "/members")
  assert.equal(
    getSafeDashboardNextPath("/drop-ins?source=nav#entry"),
    "/drop-ins?source=nav#entry"
  )
})

test("falls back for external, protocol-relative, and unknown return paths", () => {
  assert.equal(getSafeDashboardNextPath("https://example.com"), "/")
  assert.equal(getSafeDashboardNextPath("//example.com"), "/")
  assert.equal(getSafeDashboardNextPath("/settings"), "/")
  assert.equal(getSafeDashboardNextPath(undefined), "/")
})

test("builds sign-in paths with encoded safe dashboard next params", () => {
  assert.equal(
    getDashboardSignInPath("/members?status=ACTIVE"),
    "/sign-in?next=%2Fmembers%3Fstatus%3DACTIVE"
  )
  assert.equal(
    getDashboardSignInPath("https://example.com"),
    "/sign-in?next=%2F"
  )
})
