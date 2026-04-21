# Mobile Bottom Navigation

Status: Implemented. Verified with lint, typecheck, unit tests, Next.js runtime
error checks, and a Playwright mobile screenshot on the local dev server.

## Goal

Keep the mobile dashboard navigation usable with five routes while preserving
the existing dark industrial design system.

The previous mobile bar rendered every route as an icon plus a visible label in
five equal columns. At narrow phone widths, longer labels such as
`Subscriptions` and `Drop-ins` competed for space and made the bar feel crowded.

## Implemented

- Kept the mobile navigation anchored edge-to-edge at the bottom of the screen.
- Preserved the existing bottom-bar surface: top border, translucent
  background, backdrop blur, and safe-area padding.
- Avoided a floating dock treatment; the bar remains part of the app shell.
- Kept all five dashboard routes available on mobile:
  `/`, `/members`, `/subscriptions`, `/drop-ins`, and `/settings`.
- Changed inactive mobile routes to centered icon buttons.
- Changed the active mobile route to an expanded icon-plus-label pill.
- Kept desktop navigation unchanged in the sidebar.
- Updated `DashboardShellFallback` so the loading shell matches the runtime
  bottom-bar structure and does not jump during load.

## Design Rules

Future changes to the mobile bottom navigation should follow these constraints:

- Use a full-width bottom bar, not a floating rounded container.
- Keep inactive items icon-only to avoid label collisions at phone widths.
- Show the label only for the active route.
- Maintain at least 44px touch targets.
- Use existing design tokens such as `background`, `border`, `primary`,
  `muted-foreground`, and `shell-highlight`.
- Keep the desktop sidebar behavior separate from mobile bottom-bar behavior.

## Files

- `components/dashboard/app-shell.tsx`
- `components/dashboard/dashboard-shell-fallback.tsx`

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`
- Next.js MCP runtime error check on port 3000
- Playwright screenshot at a 407px mobile viewport
