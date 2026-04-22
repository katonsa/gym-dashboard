# CSV Import/Export

Status: Active. Covers member import and dashboard CSV exports for owner-scoped
gym data.

## Overview

Gym owners can import existing member rosters from CSV so they do not need to
enter historical records one at a time. They can also export roster, payment,
drop-in, and monthly revenue report data for backup and bookkeeping workflows.

The v1 design is intentionally conservative:

- Import is browser-session scoped until confirmation.
- Raw CSV files, mappings, preview rows, duplicate choices, and failed-row CSVs
  are not persisted.
- Confirmation revalidates on the server before writing.
- Export route handlers always derive gym scope from the authenticated owner.

## Entry Points

Import UI:

- `app/(dashboard)/members/member-csv-import-flow.tsx`
- `/members`, next to `Add member`
- setup checklist step 2, next to the manual member form

Import server action:

- `app/(dashboard)/members/import-actions.ts`

Export routes:

- `/api/exports/members`
- `/api/exports/membership-payments`
- `/api/exports/drop-ins`
- `/api/exports/monthly-report?month=YYYY-MM`

Shared helpers:

- `lib/dashboard/member-import.ts`
- `lib/dashboard/export-csv.ts`
- `lib/dashboard/csv.ts`

## Member Import Flow

1. The owner uploads a `.csv` file.
2. The browser parses headers and rows.
3. The app auto-detects likely column mappings.
4. The owner can adjust mappings before preview.
5. `previewMemberImport` validates mapped rows, checks active plan tiers, and
   runs duplicate detection scoped to the owner gym.
6. The owner reviews valid rows, invalid rows, warnings, and duplicates.
7. Nothing is saved until the owner confirms the import.
8. `confirmMemberImport` revalidates the same mapped rows server-side.
9. Confirmed valid rows are created; invalid or skipped rows are reported in the
   summary.

V1 limits:

- CSV files only.
- 2 MB max file size.
- 2,000 data rows max.
- No persisted import drafts.
- No imported membership price override.
- No membership payment creation during import.

## Example Member CSV

```csv
name,email,phone,status,join date,plan,billing interval,next billing date,last attended,notes
Ari Putra,ari@example.test,+62 812 0000 0001,active,2026-01-15,Basic,monthly,2026-05-15,2026-04-20,Transferred from old spreadsheet
Sinta Wijaya,sinta@example.test,,inactive,2025-11-02,,,,,
```

## Supported Member Columns

Common header names are auto-detected, and owners can manually adjust mappings.
Optional unmapped fields are allowed.

| Dashboard field    | Required | Example headers                                  |
| ------------------ | -------- | ------------------------------------------------ |
| Full name          | Either   | `name`, `full name`, `member name`               |
| First name         | Either   | `first name`, `given name`                       |
| Last name          | Either   | `last name`, `surname`, `family name`            |
| Email              | No       | `email`, `email address`                         |
| Phone              | No       | `phone`, `mobile`, `phone number`                |
| Status             | No       | `status`, `member status`                        |
| Join date          | No       | `join date`, `joined`, `start date`              |
| Plan               | No       | `plan`, `membership plan`, `plan name`           |
| Billing interval   | No       | `billing`, `billing interval`, `interval`        |
| Next billing date  | No       | `next billing`, `next billing date`, `renewal`   |
| Notes              | No       | `notes`, `note`, `comments`                      |
| Last attended date | No       | `last attended`, `last visit`, `last attendance` |

Required identity can be either `Full name` or both `First name` and
`Last name`. A one-token full name is invalid because the database stores first
and last names separately. For full names with more than two tokens, the first
token becomes `firstName` and the remaining tokens become `lastName`.

Date input accepts `YYYY-MM-DD`, `MM/DD/YYYY`, and values JavaScript can parse
unambiguously. Dates are normalized to `YYYY-MM-DD`. Missing join dates default
to the gym-local import date. Missing optional dates stay empty.

Status defaults to `ACTIVE`. Accepted imported status values are active,
inactive, and suspended, case-insensitively.

Billing interval accepts monthly or annual values, case-insensitively. The
implementation accepts common variants such as `month`, `m`, `yearly`, and `y`.

Validation failures block that row:

- missing or one-token name
- invalid email
- invalid status
- invalid join date
- invalid optional date
- email longer than 255 characters
- phone longer than 50 characters
- notes longer than 1,000 characters

Warnings do not block member creation:

- mapped plan does not match an active plan tier
- plan is present but billing interval is missing or invalid
- billing interval is present without an active mapped plan

## Duplicate Handling

Import duplicate detection reuses the same matching rules as manual member
creation in `lib/dashboard/member-duplicate-detection.ts`.

Duplicate matches are scoped to the owner gym and show reason badges:

- `email`
- `phone`
- `similar-name`

Duplicate rows are skipped by default. The owner can mark individual duplicate
rows as `Import anyway` before confirming.

Important implementation detail: confirmation re-runs duplicate detection
against current database state. This means rows can become duplicates between
preview and confirmation if another member is created in the meantime.

## Membership Creation

If an imported row has a plan and billing interval, the plan must map to an
active plan tier in the owner gym. Plan names match case-insensitively after
trimming.

When plan and billing interval are both valid, import creates a current
membership:

- `startedAt` is the join date.
- `nextBillingDate` uses the imported next billing date when present.
- Otherwise it is calculated from the join date and billing interval.
- `currentPeriodEndsAt` matches `nextBillingDate`.
- `priceAmount` uses the selected plan tier current monthly or annual price.

Incomplete or unmatched membership fields do not block member import. The row
is imported without a membership and shows a warning in the preview/summary.

Import does not create `MembershipPayment` rows. This avoids fabricating
historical payment state for old rosters.

The import write path runs in a single database transaction. If an unexpected
write error occurs, no partial subset of that confirmation is committed.

## Import Summary

After confirmation, the summary shows:

- created members
- skipped rows
- duplicate overrides
- failed rows

Failed rows can be downloaded as CSV with an `error_reasons` column. The member
roster refreshes after a successful import.

Skipped duplicate rows are not included in the failed-row CSV unless they also
have validation errors.

## Exports

Exports are implemented as authenticated route handlers that scope every query
to the owner gym and return `text/csv` with a download filename.

Member export columns:

```csv
name,email,phone,status,join_date,current_plan,billing_interval,next_billing_date,last_attended_date,notes
```

Membership payment export columns:

```csv
payment_id,member_id,member_name,plan,amount,currency_code,status,due_date,paid_date,notes
```

Drop-in export columns:

```csv
visit_id,visitor_name,visitor_contact,visit_count,amount,currency_code,visited_date,notes
```

Monthly report export columns:

```csv
month,membership_revenue,drop_in_revenue,total_revenue,new_sign_ups,overdue_payments,renewals,active_member_count,currency_code
```

CSV dates use `YYYY-MM-DD`. Money columns are numeric amounts plus
`currency_code`.

Export filenames:

- `members.csv`
- `membership-payments.csv`
- `drop-in-visits.csv`
- `monthly-report-YYYY-MM.csv`

Unauthenticated requests return `401`. Invalid monthly report month parameters
return `400`.

## Monthly Report Math

The monthly report uses dashboard-style revenue math so exported values match
current dashboard/subscription calculations:

- membership revenue is monthly-equivalent membership revenue
- annual membership price is divided by 12
- drop-in revenue is the sum of drop-in visit amounts in the selected month
- total revenue is membership revenue plus drop-in revenue

The report month uses the gym timezone. Active member count uses the current
member status model already present in the app.

Implementation note:

- the export reuses the shared subscription revenue-trend helper instead of
  maintaining a separate overlap query
- this keeps gym-local month boundaries aligned with `/subscriptions`
- changes to revenue-trend math should be verified against both the export route
  and the subscriptions page

The monthly report intentionally does not mean cash received. Membership payment
cash reconciliation is available through the membership payments export.

## V1 Non-Goals

- Persisting import drafts.
- Remembering column mappings across imports.
- Editing CSV rows in the app before import.
- Creating new plan tiers from import.
- Importing explicit membership prices.
- Creating payment records during import.
- Export filtering by current page search/filter state.
- Background jobs for very large imports.

## Verification

Regression coverage includes:

- column auto-detection and manual mapping
- row normalization and validation
- duplicate skip and override behavior
- plan matching and membership creation
- failed-row CSV output
- export CSV escaping and gym scoping
- monthly report values matching dashboard aggregate helpers

Run before larger changes to this feature:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

The production build may need network access because `next/font` fetches Google
Fonts during build.
