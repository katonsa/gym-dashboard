# Account Settings

Status: Planned.

## Goal

Give every signed-in dashboard user a personal account area for changing their
own email address and password. This is intentionally separate from gym
settings.

## Product Decision

Account settings belong to the signed-in user, not to the gym owner role.

- `/account` is for personal identity and security.
- `/settings` stays focused on gym administration, such as gym profile defaults
  and plan tiers.

## Scope

The first version should support:

- viewing the current account email
- changing the current user's email address immediately
- changing the current user's password
- requiring the current password for both changes
- revoking all other sessions after either change

The first version should not add:

- email verification
- transactional email
- password reset or account recovery
- staff invitations or role management
- staff authorization, roles, or permissions
- audit-log UI

## User Flows

### Change Email

1. User opens `/account`.
2. User enters a new email address.
3. User confirms their current password.
4. The app validates the new email and password.
5. The app updates `User.email` immediately.
6. The app revokes all other sessions for that user.
7. The current session remains active and the UI refreshes with the new email.

Validation rules:

- `newEmail` is required, trimmed, lowercased, and valid email format.
- `newEmail` must differ from the current session email.
- `newEmail` must not already belong to another user.
- `currentPassword` is required and must match the signed-in user.

### Change Password

1. User opens `/account`.
2. User enters their current password.
3. User enters and confirms a new password.
4. The app validates the current password and new password rules.
5. better-auth updates the credential password.
6. better-auth revokes other sessions.
7. The current session remains active and the form clears.

Validation rules:

- `currentPassword` is required.
- `newPassword` is required and should use the same app-level length range as
  setup: at least 8 characters and 128 characters or fewer.
- `confirmPassword` must match `newPassword`.
- The form should show a generic invalid-password message for failed
  confirmation.

## Security Model

The current password is the required proof of account control. This replaces
email verification for the initial version because the product does not yet
include a transactional email layer.

Implementation should use better-auth where it owns credential security:

- Use better-auth `verifyPassword` before changing email.
- Use better-auth `changePassword` for password updates.
- Use better-auth `revokeOtherSessions` after successful immediate email
  updates.
- Pass `revokeOtherSessions: true` to better-auth password changes.
- Pass the current request headers to every better-auth server API call that
  depends on the active session.

The email update is app-owned for this milestone because better-auth's built-in
email change route expects a verification-capable flow unless specific
verification conditions are configured. That conflicts with the current product
decision to accept email changes immediately without email sending.

For password length, the app schema should mirror the setup form's current
8-to-128-character range for immediate user feedback. better-auth remains the
source of truth for credential verification, password hashing, and any provider
errors returned during `changePassword`.

## UX Placement

Add a new dashboard route:

- `app/(dashboard)/account/page.tsx`

Recommended page sections:

- **Account email**
  - show current email
  - form fields: new email, current password
  - submit label: `Change email`

- **Password**
  - form fields: current password, new password, confirm password
  - submit label: `Change password`

Navigation can be handled in one of two ways:

- Add `Account` to the primary dashboard navigation if discoverability is more
  important.
- Add `Account` near the sign-out/theme controls if the primary nav should stay
  focused on gym workflows.

The first implementation should prefer the lower-risk option that best matches
the current shell layout. Add `/account` to `dashboardRouteHrefs` regardless of
navigation placement so `requireDashboardSession("/account")` is type-safe and
sign-in redirects can safely return to the page.

## Code Ownership

Recommended files:

| File                                          | Responsibility                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `app/(dashboard)/account/page.tsx`            | Server page, session guard, current email display props.                   |
| `app/(dashboard)/account/actions.ts`          | Account update server actions.                                             |
| `app/(dashboard)/account/email-form.tsx`      | Client form for email changes.                                             |
| `app/(dashboard)/account/password-form.tsx`   | Client form for password changes.                                          |
| `lib/auth/schemas/account-settings-schema.ts` | Zod schemas and normalized values.                                         |
| `lib/auth/account-service.ts`                 | Email uniqueness checks and user email update helper, if the action grows. |
| `lib/application/dashboard-routes.ts`         | Add `/account` as a safe dashboard route.                                  |
| `lib/dashboard/navigation.ts`                 | Add account navigation only if it is in the primary nav.                   |

Keep the first version thin. If the server actions become mostly orchestration,
move reusable email-change logic into `lib/auth/account-service.ts`.

## Server Action Shape

The account actions must authenticate and authorize inside the action. Next.js
Server Actions are reachable by direct POST requests, so the UI cannot be the
only boundary.

Recommended email action behavior:

1. `requireDashboardSession("/account")`.
2. Parse with `changeEmailSchema`.
3. Read `const requestHeaders = await headers()`.
4. Call `auth.api.verifyPassword` with `headers: requestHeaders`.
5. If the password is invalid, return a generic invalid-password error.
6. Check for an existing user with the normalized email.
7. Update only `User` where `id === session.user.id`.
8. Catch the Prisma unique-email constraint error and return the same duplicate
   email result used by the preflight check.
9. Call `auth.api.revokeOtherSessions` with `headers: requestHeaders`.
10. Revalidate `/account` and the dashboard layout if user email is displayed
    there later.
11. Return the existing `ActionResult` shape used by dashboard forms.

Recommended password action behavior:

1. `requireDashboardSession("/account")`.
2. Parse with `changePasswordSchema`.
3. Read `const requestHeaders = await headers()`.
4. Call better-auth `changePassword` with `headers: requestHeaders` and
   `revokeOtherSessions: true`.
5. Revalidate `/account` if needed.
6. Return the existing `ActionResult` shape used by dashboard forms.

Email uniqueness needs both a preflight check and write-time error handling:

1. The preflight check gives the user a friendly duplicate-email error.
2. The unique constraint catch handles concurrent requests where another account
   claims the same email between the check and update.

## Boundary Notes

This plan is limited to personal account settings. It should not introduce staff
tables, staff routes, role checks, permissions, invitations, or gym membership
models.

The only future-facing design constraint is that account settings should remain
scoped to `session.user.id`, so later role work does not need to move personal
email/password management out of `/account`.

## Testing Plan

Add focused tests for:

- account settings schema normalization and validation
- rejecting duplicate email addresses
- rejecting same-email changes
- rejecting invalid current passwords
- mapping duplicate-email unique constraint errors to the friendly duplicate
  result
- updating only the signed-in user's email
- revoking other sessions after successful email change
- calling better-auth password change with session revocation
- accepting `/account` as a safe dashboard next path

Run before merging:

- `npm test`
- `npm run typecheck`
- `npm run lint`

For UI implementation, also verify `/account` in browser automation after
signing in with the seeded owner account.

## Related Files

- [lib/auth/index.ts](../../lib/auth/index.ts) - better-auth server instance.
- [lib/auth/client.ts](../../lib/auth/client.ts) - better-auth browser client.
- [lib/auth/server.ts](../../lib/auth/server.ts) - dashboard session helpers.
- [app/(dashboard)/settings/page.tsx](<../../app/(dashboard)/settings/page.tsx>)
  - existing gym settings route to keep separate from account settings.
- [docs/architecture/auth-and-account-provisioning.md](../architecture/auth-and-account-provisioning.md)
  - current account provisioning model.
- [docs/features/gym-settings.md](./gym-settings.md) - current gym settings
  behavior and route ownership.
