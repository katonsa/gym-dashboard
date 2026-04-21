# shadcn Empty State Migration

Status: Implemented. Verified with typecheck and lint.

## Goal

Use the shadcn registry empty-state primitive for dashboard empty states while
keeping the existing dashboard `EmptyState` API stable.

## Implemented

- Added the shadcn `empty` component from the configured registry at
  `components/ui/empty.tsx`.
- Refactored `components/dashboard/empty-state.tsx` to compose the shadcn
  `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, and `EmptyContent`
  primitives.
- Preserved the existing dashboard wrapper props:
  `title`, `detail`, `actionLabel`, `actionHref`, and `dashed`.
- Kept existing dashboard call sites unchanged, including overview, members,
  subscriptions, and drop-ins empty states.
- Kept the wrapper server-compatible. It does not use state, effects, event
  handlers, or browser-only APIs.

## Preserved Behavior

- Empty-state action links still render through `Button asChild` and
  `next/link`.
- Dashed empty states still render a dashed card border.
- Non-dashed empty states still render as bordered dashboard cards.
- Text remains left-aligned to match the existing dashboard layout.

## Verification

Commands run:

- `npm run typecheck`
- `npm run lint`

## Note

The first registry install attempt failed because the sandbox could not resolve
`registry.npmjs.org`. The same command succeeded after network access was
approved:

```bash
npx shadcn@latest add @shadcn/empty
```
