# Gym Settings

Status: Implemented. Verified with unit tests, typecheck, lint, Next.js runtime
error checks, and browser automation against the local dev server.

## Goal

Let a gym owner manage the operational defaults already stored on the `Gym`
record:

- gym name
- timezone
- currency
- default drop-in fee

These settings control dashboard display and new drop-in entry defaults. No
database migration was required because the fields already existed in
`prisma/schema.prisma`.

## Implemented

- Added a `/settings` dashboard route.
- Added `Settings` to the desktop sidebar and mobile dashboard navigation.
- Added `/settings` to safe dashboard return paths for sign-in redirects.
- Added a settings page that loads the authenticated owner's first gym.
- Added a client settings form using the existing dashboard
  `react-hook-form`, Zod, inline error, pending button, and Sonner success toast
  pattern.
- Added an owner-scoped server action that updates only the authenticated
  owner's gym and delegates the write to `lib/gyms/settings-service.ts`.
- Revalidated `/settings`, `/drop-ins`, `/`, and the root layout after saving
  so the app shell name, currency formatting, timezone-sensitive dates, and
  default drop-in fee can refresh.

## Validation

The settings schema lives in
`lib/gyms/schemas/settings-schema.ts`.

Validation rules:

- `name`: trimmed, required, 100 characters or fewer.
- `timezone`: required and limited to the supported timezone option list.
- `currencyCode`: trimmed, uppercased, and limited to the supported currency
  option list.
- `defaultDropInFeeAmount`: required whole-number string from `0` to
  `10,000,000`, normalized to a number before persistence.

Supported timezone and currency options are shared by the schema and form from
`lib/gyms/settings-options.ts`.

## Behavior Notes

- Currency changes affect dashboard formatting and future entries; historical
  stored amounts are not rewritten.
- Default drop-in fee changes affect new drop-in entries; existing drop-in
  visits are not changed.
- Timezone changes affect dashboard date boundaries and labels that use the gym
  timezone.
- The settings action follows the same authorization model as other dashboard
  actions: authenticate first, select the owner's gym, then update by that gym
  id.

## Timezone Boundary Follow-up

The first implementation saved the timezone and refreshed the affected pages,
but a review found some dashboard calculations still used UTC day/month windows.
That meant totals could be incorrect around local midnight or local month
boundaries for non-UTC gyms.

The follow-up was implemented with a TDD pass:

- Added gym-local day and month window helpers in
  `lib/domain/date-boundaries.ts`.
- Threaded `gym.timezone` through the overview, drop-in, and subscription
  loaders.
- Updated overview monthly metrics so new sign-ups, drop-in revenue, and
  conversion leads use gym-local month windows.
- Updated drop-in daily/monthly summaries so visits are grouped by the gym-local
  operating day and month.
- Updated subscription revenue trends to use explicit gym-local month windows
  instead of relying on database/session UTC `date_trunc` grouping.

## Regression Coverage

Added `tests/gym-settings-schema.test.ts` for:

- trimming gym name and fee inputs
- uppercasing currency codes
- normalizing the drop-in fee to a number
- rejecting unsupported timezones and currencies
- rejecting blank or too-long names
- rejecting blank, decimal, or over-limit drop-in fees

Updated `tests/auth-next-path.test.ts` so `/settings` is accepted as a safe
dashboard route.

Added timezone boundary regression coverage in
`tests/dashboard-date-boundaries.test.ts` and `tests/dashboard-aggregates.test.ts`
for:

- gym-local day windows
- gym-local month windows
- overview month metrics using the gym timezone
- drop-in daily and monthly summaries using the gym timezone
- subscription revenue trends using gym-local month windows

## Verification

Commands run:

- `npm test`
- `npm run typecheck`
- `npm run lint`

Latest TDD follow-up verification:

- `npm test`: 79 passing tests
- `npm run typecheck`: passed
- `npm run lint`: passed

Runtime checks:

- Next.js MCP reported no config or session errors.
- Browser automation loaded `http://localhost:3000/settings`.
- The unauthenticated browser session redirected to sign-in as expected for a
  protected dashboard route.
- Browser console checks reported no runtime errors or warnings.
