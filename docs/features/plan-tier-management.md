# Plan Tier Management

Status: Implemented. Verified with unit tests, integration tests, typecheck,
lint, and Next.js runtime error checks against the local dev server.

## Goal

Let a gym owner manage membership plan tiers from `/settings`:

- create arbitrary Basic/Pro/Elite-style plans
- edit plan name, description, monthly price, annual price, sort order, and
  active state
- deactivate plans without deleting historical data

The original implementation did not require a migration. The follow-up review
fix added a `normalizedName` field and unique `(gymId, normalizedName)` index so
case-insensitive plan-name uniqueness is enforced by the database.

## Implemented

- Added a `Plan tiers` section to the Settings page.
- Added a client manager form using the existing `react-hook-form`, Zod,
  inline error, pending button, and Sonner toast patterns.
- Added create, edit, and deactivate server actions in
  `app/(dashboard)/settings/actions.ts`.
- Added owner-scoped lifecycle helpers in
  `lib/plans/plan-tier-service.ts`.
- Added plan validation and normalization in
  `lib/plans/schemas/plan-tier-schema.ts`.
- Added active/past-due membership counts to the settings plan list so
  deactivate confirmations can explain the impact.
- Revalidated `/settings`, `/members`, `/members/[id]`, `/subscriptions`, and
  `/` after plan mutations. The member detail revalidation uses the
  `/members/[id]` route pattern with `type: "page"`.

## Behavior Notes

- Plan names are arbitrary strings. Basic, Pro, and Elite are examples, not a
  hardcoded enum.
- Plan names must be unique per gym. Duplicate checks are case-insensitive and
  backed by a normalized-name database constraint.
- Deactivation only sets `isActive` to `false`.
- Existing memberships stay assigned to a deactivated plan.
- Deactivated plans are hidden from new member creation and member plan-change
  selects because those flows already filter to active plans.
- Deactivated plans still appear in membership history and subscription
  reporting when they have ever had memberships. Inactive plans that were never
  assigned are hidden from subscription reporting.
- Editing a plan changes future assignment options and reporting labels/prices
  for the plan tier record. Existing `Membership.priceAmount` values are not
  rewritten.

## Validation

The plan schema accepts:

- `name`: trimmed, required, 80 characters or fewer.
- `description`: trimmed, optional, 240 characters or fewer.
- `monthlyPriceAmount`: required whole-number string from `0` to `10,000,000`.
- `annualPriceAmount`: required whole-number string from `0` to `10,000,000`.
- `sortOrder`: required whole-number string from `0` to `10,000`.
- `isActive`: boolean.

Create and update actions parse values through the schema before persistence.
The settings action file remains a thin wrapper; the lifecycle helpers expect
already-parsed values and enforce owner gym scope.

## Regression Coverage

Added `tests/plan-tier-schema.test.ts` for:

- trimming and normalizing valid plan values
- converting blank descriptions to `null`
- rejecting missing names
- rejecting decimal or over-limit prices
- rejecting invalid sort orders
- requiring a plan id for updates

Added `tests/plan-tier-management.integration.test.ts` for:

- creating a plan for the owner gym
- rejecting case-insensitive duplicate names
- rejecting cross-gym updates
- rejecting duplicate names on update
- deactivating a plan while preserving existing memberships

Updated the test runners:

- `tests/run-tests.ts`
- `tests/run-integration-tests.ts`

## Verification

Commands run:

- `npm test`: 84 passing tests
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test:integration`: 20 passing tests

Runtime checks:

- Next.js dev server was detected at `http://localhost:3000`.
- Next.js MCP `get_errors` reported no config or session errors.
- Browser automation could not complete a rendered page pass because the
  Playwright browser profile was already in use.
