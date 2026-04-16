# Gym Dashboard Implementation Tasks

This backlog turns the project brief into small, verifiable tasks. Each task should be small enough to complete in one focused pass.

## Phase 1: Foundation

- [x] Confirm app routes and navigation model
  - Define the v1 route set.
  - Keep the main dashboard at `/`.
  - Decide whether secondary views are tabs, sections, or separate routes.
  - Decision: v1 uses separate routes for secondary views: `/members`, `/subscriptions`, and `/drop-ins`. Mobile can expose these as bottom tabs, while desktop can expose the same route set in a sidebar.

- [x] Establish dashboard data contracts
  - Create TypeScript types for members, memberships, plan tiers, payments, attendance, drop-ins, alerts, and dashboard summary values.
  - Match the existing Prisma schema where possible.
  - Keep the types REST API-ready.

- [x] Add mock dashboard data
  - Seed realistic members across Basic, Pro, and Elite plans.
  - Include monthly and annual billing examples.
  - Include active, inactive, suspended, past-due, expiring, and overdue states.
  - Include drop-in visits with named and anonymous visitors.

- [x] Add calculation helpers
  - Calculate active and inactive member counts.
  - Calculate MRR from membership revenue only.
  - Normalize annual membership revenue to monthly equivalent.
  - Calculate drop-in revenue for the current month.
  - Calculate total revenue as MRR plus current-month drop-in revenue.
  - Detect expiring memberships, overdue payments, inactive members, and conversion opportunities.

## Phase 2: App Shell And Theme

- [x] Replace starter page with dashboard shell
  - Add mobile-first app layout.
  - Add desktop sidebar.
  - Add mobile bottom tab bar.
  - Keep content dense and scannable.

- [x] Implement persistent light/dark theme toggle
  - Use the existing theme provider.
  - Default to dark mode.
  - Persist the selected theme.
  - Ensure the toggle is reachable on mobile.

- [x] Define visual system tokens
  - Tune global styles for the dark industrial direction.
  - Define chart, status, alert, and revenue colors.
  - Keep electric yellow/lime as accent, not the only visible color family.

## Phase 3: Dashboard Overview

- [x] Build pinned alerts summary
  - Show expiring memberships.
  - Show overdue payments.
  - Show inactive members at churn risk.
  - Show frequent drop-in conversion opportunities.
  - Keep alerts visible above the fold on mobile.

- [x] Build overview stats panel
  - Total members with active/inactive breakdown.
  - New sign-ups this month.
  - MRR.
  - Drop-in revenue this month.
  - Total revenue.
  - Expiring subscriptions count.

- [x] Add responsive dashboard composition
  - Use a 2-column stat grid on mobile.
  - Expand to wider grid on desktop.
  - Verify all primary metrics fit without truncation.

## Phase 4: Members

- [x] Build member list for mobile and desktop
  - Use compact member cards on mobile.
  - Use a table layout on desktop.
  - Include name, plan, status, join date, next billing date, and sessions attended.

- [x] Add member search and filters
  - Search by name, email, or phone.
  - Filter by status.
  - Filter by plan tier.
  - Filter by billing risk, such as overdue or expiring.

- [x] Add member quick actions
  - Add view profile action placeholder.
  - Add edit plan action placeholder.
  - Add suspend account action placeholder.
  - Keep actions as UI-only placeholders until real mutation flow is scoped.

## Phase 5: Subscription And Revenue Views

- [x] Build subscription breakdown
  - Show member distribution by Basic, Pro, and Elite.
  - Show revenue contribution per tier.
  - Include monthly and annual plan handling.

- [x] Add Recharts dependency if missing
  - Install Recharts.
  - Verify it works with the current Next and React versions.

- [x] Build plan comparison chart
  - Compare plan count and monthly-equivalent revenue.
  - Keep the chart touch-friendly on mobile.

- [x] Build 6-month revenue trend chart
  - Show membership revenue and drop-in revenue as separate streams.
  - Show total trend.
  - Surface month-over-month movement.

## Phase 6: Drop-In Log

- [ ] Build drop-in log table/cards
  - Show date, visitor name or anonymous label, contact when present, visit count, and amount paid.
  - Use cards on mobile.
  - Use table layout on desktop.

- [ ] Add drop-in summary
  - Daily drop-in total.
  - Current-month drop-in total.
  - Frequent identified drop-ins with 5 or more visits this month.

- [ ] Add drop-in entry UI placeholder
  - Include fields for visitor name, contact, amount, visit count, and notes.
  - Default amount to the gym drop-in fee.
  - Keep submission mocked until persistence work is scoped.

## Phase 7: Quality Pass

- [ ] Verify responsive layouts
  - Check mobile width first.
  - Check tablet and desktop widths.
  - Ensure touch targets are at least 44px.
  - Ensure member and drop-in lists remain usable with longer names.

- [ ] Add focused tests for calculations
  - Test MRR normalization.
  - Test current-month drop-in revenue.
  - Test expiring membership detection.
  - Test overdue payment detection.
  - Test inactive member detection.
  - Test drop-in conversion opportunity detection.

- [ ] Run project checks
  - Run `npm run lint`.
  - Run `npm run typecheck`.
  - Run `npm run build`.

## Suggested First Sprint

1. Establish dashboard data contracts.
2. Add mock dashboard data.
3. Add calculation helpers with tests.
4. Replace starter page with the dashboard shell.
5. Build pinned alerts and overview stats.

This first sprint creates the foundation for every visible feature and gives the app a useful first screen quickly.
