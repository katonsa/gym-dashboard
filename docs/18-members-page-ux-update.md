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
- Added an operations-focused header with a roster queue summary and supporting
  copy.
- Added a compact summary strip for matching members, total members, members
  needing attention, and active filters.
- Added a `risk=attention` roster filter for the attention stat and filter UI.
- Kept the attention summary card linked to `/members?risk=attention`.
- Reworked the roster controls into a mobile-first search and filter panel.
- Added a visible `Search` label so the search input aligns with the status,
  plan, and billing-risk controls.
- Changed `Reset` from an outline button to a quieter text-style action.
- Gave search, select, and create-form fields a slightly lighter fill and subtle
  inner depth for better contrast on the dark surface.
- Made mobile/tablet member cards the primary roster presentation through the
  `xl` breakpoint.
- Kept the desktop table as the wide-screen adaptation, with member, plan,
  health, joined, next bill, visits, and actions columns.
- Kept mobile card quick actions visible: check in, view profile, edit plan,
  and suspend/unsuspend where applicable.
- Replaced the desktop table's inline action button stack with a shadcn
  `DropdownMenu` action trigger so dense rows stay scannable.

## Mobile-First Roster Layout

The `/members` page should treat the card list as the default experience. Small
and medium viewports render stacked member cards with:

- name and contact details first
- status, billing risk, and membership state badges near the top
- plan, next bill, joined date, and visit count in a two-column detail grid
- full-width, wrapping quick actions with 44px touch targets

The table is intentionally reserved for `xl` and wider screens so tablet widths
do not inherit a cramped seven-column grid.

On desktop, table rows optimize for density:

- smaller table typography and tighter cell padding
- inline health badges instead of vertically stacked badges
- a single actions trigger per row
- action menu items for check-in, profile, plan edit, and status changes

Status changes from the dropdown still open the confirmation dialog before
suspending or unsuspending a member.

The filter panel is also mobile-first:

- controls stack by default
- the search field spans the two-column tablet grid
- all controls use visible uppercase labels
- Search and Reset remain in one compact action group
- no decorative filter icon is shown inside the panel

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
- `components/ui/dropdown-menu.tsx`

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
- Browser automation signed in with the seeded owner account and verified the
  redesigned roster rendered with no horizontal overflow at the checked desktop
  viewport.
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

Design future `/members` changes mobile-first. Start with the stacked card and
control experience, then adapt upward to desktop density only when the viewport
can support it without cramped text or horizontal overflow.
