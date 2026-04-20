# Members Page UX Update

Status: Implemented. Verified with unit tests, typecheck, lint, Next.js runtime
error checks, and browser automation on the local dev server.

## Goal

Make `/members` prioritize the owner's primary morning workflow: finding and
triaging existing members before creating new records.

The previous page placed the full add-member form above the roster. That made
member creation visually dominate the screen and pushed the roster lower than
the main day-to-day task warranted.

## Implemented

- Moved member creation behind an `Add member` button in the page header.
- Rendered the create form inside a right-side slide-over dialog.
- Closed the slide-over after a successful member save.
- Removed the `Owner entry` label from the create form.
- Replaced the descriptive page subtitle with a live attention stat.
- Added a `risk=attention` roster filter for the attention stat and filter UI.
- Moved the visible-member count into the roster heading:
  `Member roster · X of Y`.
- Combined roster heading, search, filters, and table into one continuous roster
  area.
- Changed `Reset` from an outline button to a quieter text-style action.
- Gave search, select, and create-form fields a slightly lighter fill and subtle
  inner depth for better contrast on the dark surface.

## Attention Filter

The `attention` risk filter is a combined filter for members that need owner
follow-up. It includes:

- overdue payments
- expired memberships, excluding suspended members and members already counted
  as overdue
- expiring memberships, excluding suspended members and members already counted
  as overdue

This keeps the header stat and the filtered roster aligned. Clicking the header
stat routes to:

```text
/members?risk=attention
```

The changed data files are:

- `lib/dashboard/member-roster.ts`
- `lib/dashboard/query-scopes.ts`
- `lib/dashboard/loaders.ts`

## UI Files

The changed UI files are:

- `app/(dashboard)/members/page.tsx`
- `app/(dashboard)/members/member-roster.tsx`
- `app/(dashboard)/members/member-create-form.tsx`

## Regression Coverage

`tests/dashboard-query-scopes.test.ts` now verifies that
`getMemberRosterPageWhere()` builds the combined attention filter from overdue,
expiring, and expired risk branches.

## Verification

Commands run:

- `npm test`
- `npm run typecheck`
- `npm run lint`

Runtime checks:

- Next.js dev server reported no config or session errors.
- Browser automation loaded `/members`.
- Browser automation opened the `Add member` slide-over and verified it rendered
  at the right edge without horizontal page overflow.
- Browser automation clicked the attention stat and verified navigation to
  `/members?risk=attention`.
- Browser automation verified the risk filter selected `attention` and the
  roster heading reflected the filtered count.

## Rule Going Forward

Keep the roster as the primary first-screen task on `/members`. Member creation
should remain available from the header, but it should not displace roster
search, filtering, and triage unless the owner explicitly opens the creation
flow.
