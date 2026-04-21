# Sonner Toast Implementation

## Goal

Use shadcn Sonner to show transient dashboard action feedback without moving
validation or corrective messages away from the controls they describe.

## Implemented

- Added the shadcn `sonner` component from the configured registry at
  `components/ui/sonner.tsx`.
- Added the `sonner` package dependency.
- Mounted a single toaster in `app/layout.tsx` inside the existing theme
  provider so dashboard actions can emit toasts from client components.
- Use `toast.success` for completed create, update, check-in, payment, renewal,
  and member status actions.
- Use `toast.error` for non-field server action failures where the action
  feedback is transient or outside a form. Open forms and confirmation dialogs
  keep their failures inline to avoid duplicate announcements.
- Removed the old transient roster and form success text where toasts now cover
  that feedback.
- Removed empty layout placeholders left behind by the old inline success text;
  affected submit rows now align their buttons directly.

## Preserved Behavior

- Dashboard pinned alerts remain inline cards.
- Field validation, root form errors, and dialog errors remain near the relevant
  form or confirmation.
- The overview renewal shortcut still keeps its inline error because the alert
  card needs local context, while also emitting a toast for shortcut failure
  feedback.
- Server action behavior, data schemas, database tables, and route structure are
  unchanged.

## Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed.
- Follow-up review fixes were rechecked with the same three commands.
- Browser smoke check against the running Next.js dev server loaded without
  client console errors.
