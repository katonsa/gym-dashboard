# Database-Backed Dashboard Plan

Status: Planned.

The current dashboard UI is mostly built, but the visible data still comes from `mockDashboardData`. The next milestone is to connect the existing pages to the Prisma schema and database behind authentication.

## Goal

Replace mock-only dashboard rendering with database-backed reads from the existing Prisma models:

- `Gym`
- `PlanTier`
- `Member`
- `Membership`
- `MembershipPayment`
- `AttendanceRecord`
- `DropInVisit`

The first version should remain read-only except for explicitly scoped owner/admin submissions: manual member entry and drop-in entry.

## Constraints

- Keep the dashboard mobile-first.
- Keep the existing route model: `/`, `/members`, `/subscriptions`, `/drop-ins`.
- Use Server Components for database reads where possible.
- Keep client components limited to interactive UI such as filters, charts, navigation, theme toggle, and forms.
- Require authentication before showing gym data.
- Load gym data through the authenticated owner relationship.
- Build first-party auth pages before wiring database-backed dashboard data.
- Redirect unauthenticated dashboard users to `/sign-in`.
- Do not add public sign-up in this milestone.
- Allow owners/admins to add member records manually.
- Do not add payment processing or billing integrations.
- Do not add CSV import yet.
- Do not add email notifications yet.
- Do not add role-based staff permissions in this milestone.
- Avoid changing the Prisma schema unless a specific data gap is found.

## Phase 1: Auth Foundation

- [x] Create the Better Auth API route handler
  - Add `app/api/auth/[...all]/route.ts` as the catch-all handler for Better Auth.
  - Export GET and POST handlers that delegate to the `auth` instance from `lib/auth`.
  - This must exist before any sign-in form can function.

- [x] Split auth and dashboard layouts with route groups
  - Create an `(auth)` route group with its own layout that does not include `AppShell`.
  - Create a `(dashboard)` route group with the current `AppShell` layout.
  - Move existing pages (`/`, `/members`, `/subscriptions`, `/drop-ins`) into `(dashboard)`.
  - Place `/sign-in` inside `(auth)`.
  - Keep `ThemeProvider` in the root layout so the theme toggle works on all pages.

- [x] Confirm auth route model
  - Use first-party app routes instead of hosted auth screens.
  - Add `/sign-in` inside the `(auth)` route group.
  - Use a dashboard shell sign-out button action.
  - Do not add a dedicated `/sign-out` page in this milestone.
  - Ensure auth pages render without the dashboard navigation shell.

- [x] Build sign-in page
  - Use the existing Better Auth email/password setup.
  - Include email and password fields.
  - Include loading and error states.
  - Keep touch targets at least 44px.
  - On successful sign-in, return the owner to the validated `next` path or `/`.

- [x] Add authenticated shell behavior
  - Show sign-out access in the dashboard shell.
  - Keep the theme toggle available on auth pages and dashboard pages.
  - Avoid querying owner gym data from the shell until a session is confirmed.

- [x] Add auth form validation
  - Validate required fields before submitting.
  - Use email keyboard/input behavior on mobile.
  - Show server-side auth errors in plain language.
  - Avoid exposing low-level auth or database details in user-facing copy.

- [x] Add auth page empty/fallback states
  - Show a clear state when auth configuration is missing.
  - Show a clear state when the database is unavailable.
  - Keep copy temporary and operational, not promotional.

- [x] Document account creation assumption
  - Owner accounts are provisioned outside the public UI for now.
  - Local/demo owner accounts are created through seed or admin provisioning.
  - Member self-registration is out of scope.
  - Member records are added manually by the authenticated owner/admin.
  - Do not expose `/sign-up` until a future member or owner onboarding flow is scoped.

- [ ] Add server-side auth helpers
  - Get the current user session server-side.
  - Redirect unauthenticated dashboard users to `/sign-in`.
  - Preserve the attempted dashboard path in a safe `next` query param when practical.
  - Validate the `next` param: allow only relative paths starting with `/`, reject external URLs and protocol-relative URLs (`//`), reject paths that do not match known dashboard routes, and fall back to `/`.
  - Fall back to `/` after login when no safe return path is present.
  - Do not query gym-owned dashboard data without a session.

## Phase 2: Owner-Scoped Data Access

- [ ] Add owner-scoped gym lookup
  - Select the gym by the authenticated owner's user id.
  - Load only gyms where `Gym.ownerId` matches the current user id.
  - Show an empty/setup state when an authenticated user has no gym.
  - Keep role-based staff permissions out of scope.

- [ ] Define database-to-dashboard mapping
  - Map Prisma `Gym` to `GymProfile`.
  - Map Prisma `PlanTier` to dashboard plan tier type.
  - Widen `PlanTierName` from `"Basic" | "Pro" | "Elite"` to `string` so the dashboard types accept any plan name stored in the database. The current hardcoded union will break silently if a plan with a different name is created.
  - Map Prisma `Member` to dashboard member type.
  - Map Prisma `Membership` to dashboard membership type. Note that `Membership` has no direct `gymId` field; owner-scoping requires joining through `Member.gymId`. Loaders that fetch memberships must filter through the member's gym relationship.
  - Map Prisma `MembershipPayment` to dashboard payment type.
  - Map Prisma `AttendanceRecord` to dashboard attendance type.
  - Map Prisma `DropInVisit` to dashboard drop-in type.

- [ ] Add route-specific database loaders
  - Use shared auth, ownership, and mapping helpers.
  - Use route-specific database loaders to avoid overfetching.
  - Let the overview route load the combined data it needs for summary stats and alerts.
  - Keep mock data for tests only.
  - Avoid silently mixing mock data with real database data.

## Phase 3: Seed And Local Data

- [ ] Add a Prisma seed script
  - Create the demo owner account using Better Auth's own signup API or SDK rather than inserting raw account/password records. This avoids depending on internal password hashing details. If programmatic signup is not feasible, pin the Better Auth version and document the assumed hash format.
  - Document the local demo owner email and password.
  - Create one gym.
  - Create Basic, Pro, and Elite plan tiers.
  - Create realistic members across active, inactive, and suspended states.
  - Create monthly and annual memberships.
  - Create paid, pending, and overdue membership payments.
  - Create attendance records.
  - Create identified and anonymous drop-in visits.
  - Cover the same business scenarios as the mock data without requiring exact names, ids, or dates.

- [ ] Add seed command documentation
  - Document how to run Postgres with `compose.yaml`.
  - Document how to run migrations.
  - Document how to run the seed script.
  - Document how to reset local data safely.

- [ ] Verify local database startup
  - Confirm `.env` has a working `DATABASE_URL`.
  - Confirm Prisma client generation works.
  - Confirm migrations apply cleanly.
  - Confirm seeded data appears in the app.

## Phase 4: Wire Overview Page

- [ ] Refactor page components from module-scope to async Server Components
  - The current overview, members, subscriptions, and drop-ins pages compute data at module level (outside the component body). This pattern only evaluates once at build/startup and will not work with per-request database reads.
  - Convert each page to an `async` function component that fetches data inside the function body.
  - Replace `mockDashboardAsOf` with `new Date()` so calculations reflect the current time.
  - Replace the hardcoded date string in the overview header ("Thursday, Apr 16") with a dynamically formatted date.

- [ ] Replace overview mock imports
  - Load dashboard data from the server-side data access layer.
  - Calculate summary values from database-backed data.
  - Calculate alerts from database-backed data.

- [ ] Add empty states
  - No gym.
  - No members.
  - No memberships.
  - No drop-ins.
  - No alerts.

- [ ] Remove mock labels from production UI
  - Replace `Live mock data` with an accurate source/status label.
  - Keep copy focused on owner actions, not implementation details.

## Phase 5: Wire Members Page And Manual Entry

- [ ] Replace member mock imports
  - Load members, memberships, plan tiers, payments, and attendance from the database.
  - Preserve existing search and filter behavior.
  - Preserve mobile cards and desktop table layouts.

- [ ] Validate billing risk logic
  - Overdue payment risk.
  - Expiring membership risk.
  - Clear billing state.

- [ ] Add member empty states
  - No members yet.
  - No search results.
  - No results for selected filters.

- [ ] Add manual member creation
  - Add an owner/admin-facing create member form.
  - Capture first name, last name, optional email, optional phone, status, join date, plan tier, billing interval, and notes.
  - Create the member under the authenticated owner's gym.
  - Create the initial membership when a plan is selected.
  - Derive `priceAmount` from the selected plan tier and billing interval. Store the full interval amount (monthly price for monthly plans, annual price for annual plans). MRR calculations divide annual amounts by 12 at display time. This matches the existing `calculateMembershipMrr` behavior.
  - Derive `currentPeriodEndsAt` and `nextBillingDate` from the join/start date and billing interval.
  - Create the first membership payment record when an initial membership is created.
  - Ensure created members participate in MRR, expiring alerts, overdue/payment logic, and subscription breakdowns.
  - Validate required fields and billing fields before submit.
  - Use `revalidatePath` to refresh the members page after submit. Prefer `revalidatePath` over `router.refresh()` for server actions because it clears the server-side cache for the path.
  - Return a consistent result shape from server actions: `{ success: boolean, error?: string }`. Map Prisma and validation errors to plain-language messages. Do not expose raw database or auth error details to the client.

- [ ] Keep member self-service out of scope
  - Do not add public member registration.
  - Do not create member login accounts.
  - Do not expose a member portal.

## Phase 6: Wire Subscriptions Page

- [ ] Replace subscription mock imports
  - Load plans, memberships, drop-ins, and payments from the database.
  - Preserve plan breakdown calculations.
  - Preserve monthly-equivalent annual revenue handling.

- [ ] Validate chart data
  - Plan comparison chart uses real plan rows.
  - Six-month revenue trend uses real membership and drop-in data.
  - Months with no data render as zero instead of breaking charts.

- [ ] Add subscription empty states
  - No plans configured.
  - No active memberships.
  - No revenue records.

## Phase 7: Wire Drop-Ins Page And Creation

- [ ] Replace drop-in mock imports
  - Load drop-in visits from the database.
  - Load default drop-in fee from the gym record.
  - Preserve daily and monthly totals.
  - Preserve frequent visitor conversion logic.

- [ ] Implement drop-in form behavior
  - Add a server action to create drop-in visits.
  - Return a consistent result shape: `{ success: boolean, error?: string }`.

- [ ] Add drop-in creation
  - Validate amount: must be a positive integer, minimum 0, maximum bounded by a reasonable upper limit.
  - Default `visitCount` to 1 when not explicitly provided.
  - Validate `visitorContact` as free text (no format enforcement); contacts may be email, phone, or other identifiers.
  - Guard against duplicate submissions (disable submit button while pending).
  - Use gym default fee when amount is omitted.
  - Use `revalidatePath` to refresh the drop-in page after submit.
  - Keep anonymous visits supported.
  - Scope created visits to the authenticated owner's gym.

## Phase 8: Verification And Handoff

- [ ] Run data-layer checks
  - `npm run typecheck`
  - `npm run lint`
  - Existing calculation tests.
  - Add basic tests for the data access layer: verify owner-scoped queries return only the authenticated owner's gym data, verify mappers produce valid dashboard types.

- [ ] Run app checks
  - `npm run build`
  - Verify `compose.yaml` starts Postgres correctly and `.env` has a working `DATABASE_URL`.
  - Load `/sign-in`
  - Load `/`
  - Load `/members`
  - Load `/subscriptions`
  - Load `/drop-ins`

- [ ] Browser-verify core flows
  - Sign-in page renders on mobile and desktop.
  - Auth errors render without layout shift.
  - Unauthenticated dashboard routes redirect to `/sign-in`.
  - Sign-in returns the owner to the validated `next` path or `/`.
  - Sign-out ends the session and returns to auth flow.
  - Mobile overview alerts above the fold.
  - Member search and filters.
  - Owner/admin can add a member manually.
  - Created member appears in `/members`.
  - Created member contributes to `/subscriptions` when a plan is selected.
  - Created member affects overview stats.
  - Subscription charts render.
  - Drop-in log renders.
  - Owner/admin can create a drop-in visit.
  - Created drop-in appears in the drop-in log.
  - Created drop-in updates drop-in revenue totals.
  - Light/dark toggle still persists.

- [ ] Update handoff notes
  - Document auth assumptions.
  - Document owner account provisioning.
  - Document seed data coverage.
  - Document runtime data source and test-only mock data.

## Resolved Decisions

- The app requires authentication before showing gym data.
- Dashboard data must be owner-scoped through `Gym.ownerId`.
- Auth pages should be planned before database-backed dashboard wiring.
- Unauthenticated dashboard users should be redirected to `/sign-in`.
- Redirects should preserve a safe `next` return path when practical.
- Public sign-up is out of scope for this milestone.
- Owner accounts are provisioned outside the public UI for now.
- Local/demo owner accounts are created through seed or admin provisioning.
- Owners/admins can add member records manually.
- Member self-registration, member login accounts, and member portals are out of scope.
- Role-based staff permissions are out of scope for this milestone.
- Dashboard pages should use route-specific database loaders backed by shared auth, ownership, and mapping helpers.
- Sign-out should be a button action in the dashboard shell, not a standalone page.
- Auth pages should render without the dashboard navigation shell.
- Auth and dashboard pages use separate route groups: `(auth)` without `AppShell`, `(dashboard)` with `AppShell`.
- DB-backed v1 should include write support for manual member entry and drop-in entries.
- Manual member entry should create consistent membership and payment records when a plan is selected.
- `priceAmount` on `Membership` stores the full interval amount (monthly or annual). MRR calculations divide annual amounts by 12 at display time.
- Seed data must include a usable demo owner login for local development.
- Seed accounts should be created through Better Auth's API when possible, not by inserting raw password hashes.
- Mock data should remain available for tests only, not as runtime fallback.
- Seed data should cover the same scenarios as the current mock data, but does not need to exactly mirror it.
- `PlanTierName` should be widened to `string` so the dashboard accepts any plan name from the database.
- Server actions return `{ success: boolean, error?: string }` and map internal errors to plain-language messages.
- Use `revalidatePath` (not `router.refresh()`) after server action mutations to clear the server-side cache.
- The `next` query param on `/sign-in` must be validated: relative paths only, no external URLs, no protocol-relative URLs, must match a known dashboard route.

## Suggested First Task

Start with the auth route model and sign-in page. Once that exists, add server-side auth helpers and owner-scoped dashboard data loading.
