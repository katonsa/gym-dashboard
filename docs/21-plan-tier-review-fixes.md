# Plan Tier Review Fixes

Status: Implemented. Verified with unit tests, integration tests, typecheck,
and lint.

## Goal

Fix issues identified in a code review and a Vercel React best practices review
of the plan tier management feature.

## Changes

### Bug fix: broken member detail revalidation

Removed `revalidatePath("/members/[id]", "page")` from the plan tier mutation
revalidation helper. The literal `[id]` never matched any actual route — every
other action in the codebase uses template literals with real IDs. The
`/members` list revalidation already covers the roster page.

### Dead code removal

Removed `normalizePlanTierValues` from `plan-tier-schema.ts`. The function was
only referenced in its own unit tests. The actions pass parsed values to
lifecycle helpers which use the identical `toPlanTierData` conversion in
`plan-tier-management.ts`. Removed the two normalization test cases from
`plan-tier-schema.test.ts`.

### RSC serialization optimization

Omitted `gymId` from `PlanTierManagementRow` and the data returned by
`getPlanTierManagementRows`. The `PlanTierManager` client component never used
`gymId`, so it was unnecessary serialization at the RSC boundary.

### Bundle optimization

Added `optimizePackageImports: ['lucide-react']` to `next.config.mjs`. The
project imports from `lucide-react` in 15+ files using barrel imports, which
loads all ~1,583 icon modules on every cold start.

### Redundant submit state

Simplified the form submit check from
`form.formState.isSubmitting || isPending` to just `isPending`. The form's
`isSubmitting` is only true for the synchronous tick of `handleSubmit` and
doesn't persist through the `startTransition` async work.

### Transaction consistency

Wrapped `deactivatePlanTierForGym` in `client.$transaction()` to match the
pattern used by `createPlanTierForGym` and `updatePlanTierForGym`.

### Test improvement

Added a `monthlyPriceAmount` assertion to the update integration test. The test
was changing the price to 400000 but only asserting the name change.

## Touched Files

- `next.config.mjs`
- `app/(dashboard)/settings/actions.ts`
- `app/(dashboard)/settings/plan-tier-manager.tsx`
- `lib/dashboard/plan-tier-management.ts`
- `lib/dashboard/schemas/plan-tier-schema.ts`
- `tests/plan-tier-schema.test.ts`
- `tests/plan-tier-management.integration.test.ts`

## Verification

Commands run:

- `npm test`: 82 passing tests
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test:integration`: 20 passing tests
