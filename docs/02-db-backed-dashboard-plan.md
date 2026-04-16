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

- [ ] Confirm auth route model
  - Use first-party app routes instead of hosted auth screens.
  - Add `/sign-in`.
  - Use a dashboard shell sign-out button action.
  - Do not add a dedicated `/sign-out` page in this milestone.
  - Ensure auth pages render without the dashboard navigation shell.
  - Split auth and dashboard layouts if needed, likely with route groups.
  - Confirm the Better Auth API route handler exists before wiring forms.

- [ ] Build sign-in page
  - Use the existing Better Auth email/password setup.
  - Include email and password fields.
  - Include loading and error states.
  - Keep touch targets at least 44px.
  - On successful sign-in, return the owner to the validated `next` path or `/`.

- [ ] Add authenticated shell behavior
  - Show sign-out access in the dashboard shell.
  - Keep the theme toggle available on auth pages and dashboard pages.
  - Avoid querying owner gym data from the shell until a session is confirmed.

- [ ] Add auth form validation
  - Validate required fields before submitting.
  - Use email keyboard/input behavior on mobile.
  - Show server-side auth errors in plain language.
  - Avoid exposing low-level auth or database details in user-facing copy.

- [ ] Add auth page empty/fallback states
  - Show a clear state when auth configuration is missing.
  - Show a clear state when the database is unavailable.
  - Keep copy temporary and operational, not promotional.

- [ ] Document account creation assumption
  - Owner accounts are provisioned outside the public UI for now.
  - Local/demo owner accounts are created through seed or admin provisioning.
  - Member self-registration is out of scope.
  - Member records are added manually by the authenticated owner/admin.
  - Do not expose `/sign-up` until a future member or owner onboarding flow is scoped.

- [ ] Add server-side auth helpers
  - Get the current user session server-side.
  - Redirect unauthenticated dashboard users to `/sign-in`.
  - Preserve the attempted dashboard path in a safe `next` query param when practical.
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
  - Map Prisma `Member` to dashboard member type.
  - Map Prisma `Membership` to dashboard membership type.
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
  - Create one demo owner user.
  - Create Better Auth-compatible account/password records for email/password sign-in.
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
  - Derive `priceAmount` from the selected plan tier and billing interval.
  - Derive `currentPeriodEndsAt` and `nextBillingDate` from the join/start date and billing interval.
  - Create the first membership payment record when an initial membership is created.
  - Ensure created members participate in MRR, expiring alerts, overdue/payment logic, and subscription breakdowns.
  - Validate required fields and billing fields before submit.
  - Revalidate or refresh the members page after submit.

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

- [ ] Add drop-in creation
  - Validate amount, visit count, and optional visitor fields.
  - Use gym default fee when amount is omitted.
  - Revalidate or refresh the drop-in page after submit.
  - Keep anonymous visits supported.
  - Scope created visits to the authenticated owner's gym.

## Phase 8: Verification And Handoff

- [ ] Run data-layer checks
  - `npm run typecheck`
  - `npm run lint`
  - Existing calculation tests

- [ ] Run app checks
  - `npm run build`
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
- Auth and dashboard pages may need separate layouts or route groups.
- DB-backed v1 should include write support for manual member entry and drop-in entries.
- Manual member entry should create consistent membership and payment records when a plan is selected.
- Seed data must include a usable demo owner login for local development.
- Mock data should remain available for tests only, not as runtime fallback.
- Seed data should cover the same scenarios as the current mock data, but does not need to exactly mirror it.

## Suggested First Task

Start with the auth route model and sign-in page. Once that exists, add server-side auth helpers and owner-scoped dashboard data loading.
