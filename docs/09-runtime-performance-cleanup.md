# Runtime Performance Cleanup

Status: Complete.

This note records the cleanup that followed the dashboard pagination and
database aggregation work. The goal was to remove the legacy "load everything
into a dashboard bag" paths after the runtime pages were verified on the
database-backed loaders.

## What Changed

- Removed the unused full members loader, `loadMembersDashboardData`.
- Removed the legacy `DashboardData` type and the `mock-data.ts` fixture.
- Removed roster code that scanned all memberships, payments, and attendance to
  build rows.
- Kept the member roster on `loadMemberRosterPage`, which applies search,
  filters, counts, billing risk, and pagination at the database/query level.
- Kept drop-in summaries on aggregate loaders and the drop-in log on
  `loadDropInLogPage`.
- Kept member detail payment and attendance history on independent paginated
  loaders.
- Trimmed tests that only covered removed full-load paths.
- Updated the runtime data source, pagination, aggregation, and DB-backed
  dashboard docs to match the current implementation.

## Current Runtime Loader Shape

| Route            | Loader shape                                                                           |
| ---------------- | -------------------------------------------------------------------------------------- |
| `/`              | `loadOverviewSummary()` and `loadOverviewAlerts()`                                     |
| `/members`       | `loadMemberRosterPage()`                                                               |
| `/members/[id]`  | `loadMemberDetailData()`, `loadMemberPaymentsPage()`, and `loadMemberAttendancePage()` |
| `/subscriptions` | `loadSubscriptionSummary()`                                                            |
| `/drop-ins`      | `loadDropInSummary()` and `loadDropInLogPage()`                                        |

## Removed Legacy Paths

The following patterns should not be reintroduced:

- Runtime fallback to mock dashboard data.
- A full-page `DashboardData` object used as a cross-route data bag.
- Full-table member roster rendering through `buildMemberRosterRows`.
- Global membership/payment scans for member roster billing risk.
- Full drop-in list loading for display pagination.

## Verification

The cleanup was verified with:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Browser smoke checks for `/members` and `/drop-ins`
- Next.js runtime error check through the dev server MCP tools

`npm run build` requires network access in this project because `next/font`
fetches the Geist font files from Google Fonts during production builds.

## Remaining Notes

`getExpiringMemberships` remains in `calculations.ts` because the member detail
page uses it to derive the member-level billing risk from already-loaded
membership rows. Summary and alert counts use database aggregate queries instead.
