# Account Settings

Status: Implemented.

## Goal

Give every signed-in dashboard user a personal account area for changing their
own email address and password. This is intentionally separate from gym
settings.

## Product Decision

Account settings belong to the signed-in user, not to the gym owner role.

- `/account` is for personal identity and security.
- `/settings` stays focused on gym administration, such as gym profile defaults
  and plan tiers.

## Current Scope

The current version supports:

- viewing the current account email
- changing the current user's email address immediately
- changing the current user's password
- requiring the current password for both changes
- revoking all other sessions after either change

The current version does not add:

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
- `newPassword` is required and uses the same app-level length range as setup:
  at least 8 characters and 128 characters or fewer.
- `confirmPassword` must match `newPassword`.
- The form shows a generic invalid-password message for failed confirmation.

## Security Model

The current password is the required proof of account control. This replaces
email verification because the product does not yet include a transactional
email layer.

The implementation uses better-auth where it owns credential security:

- Use better-auth `verifyPassword` before changing email.
- Use better-auth `changePassword` for password updates.
- For email updates, revoke other active sessions by deleting the other session
  rows in the same Prisma transaction as the `User.email` update.
- Pass `revokeOtherSessions: true` to better-auth password changes.
- Pass the current request headers to every better-auth server API call that
  depends on the active session.

The email update is app-owned because better-auth's built-in email change route
expects a verification-capable flow unless specific verification conditions are
configured. That conflicts with the current product decision to accept email
changes immediately without email sending.

For password length, the app schema mirrors the setup form's current
8-to-128-character range for immediate user feedback. better-auth remains the
source of truth for credential verification, password hashing, and any provider
errors returned during `changePassword`.

## UX Placement

The feature lives at:

- `app/(dashboard)/account/page.tsx`

Current page sections:

- **Account email**
  - show current email
  - form fields: new email, current password
  - submit label: `Change email`

- **Password**
  - form fields: current password, new password, confirm password
  - submit label: `Change password`

Navigation is handled by adding `Account` near the sign-out and theme controls
so the primary nav stays focused on gym workflows. `/account` is also included
in `dashboardRouteHrefs` so `requireDashboardSession("/account")` is type-safe
and sign-in redirects can safely return to the page.

## Code Ownership

Current files:

| File                                          | Responsibility                                              |
| --------------------------------------------- | ----------------------------------------------------------- |
| `app/(dashboard)/account/page.tsx`            | Server page, session guard, current email display props.    |
| `app/(dashboard)/account/actions.ts`          | Account update server actions.                              |
| `app/(dashboard)/account/email-form.tsx`      | Client form for email changes.                              |
| `app/(dashboard)/account/password-form.tsx`   | Client form for password changes.                           |
| `lib/auth/schemas/account-settings-schema.ts` | Zod schemas and normalized values.                          |
| `lib/auth/account-service.ts`                 | Email uniqueness checks and account mutation orchestration. |
| `lib/application/dashboard-routes.ts`         | Safe dashboard route typing for `/account`.                 |
| `components/dashboard/app-shell.tsx`          | Account link near theme and sign-out controls in the shell. |

The first implementation stays thin. Reusable email and password orchestration
lives in `lib/auth/account-service.ts`.

## Server Action Behavior

The account actions authenticate and authorize inside the action. Next.js
Server Actions are reachable by direct POST requests, so the UI is not the only
boundary.

Current email action behavior:

1. `requireDashboardSession("/account")`.
2. Parse with `changeEmailSchema`.
3. Read `const requestHeaders = await headers()`.
4. Call `auth.api.verifyPassword` with `body.password` and
   `headers: requestHeaders`.
5. If the password is invalid, return a generic invalid-password error.
6. Check for an existing user with the normalized email.
7. In one Prisma transaction, update only `User` where
   `id === session.user.id` and delete active `Session` rows for the same user
   where `token !== session.session.token`.
8. Catch the Prisma unique-email constraint error and return the same duplicate
   email result used by the preflight check.
9. Revalidate `/account` and the dashboard layout.
10. Return the existing success/error action result shape used by dashboard
    forms.

Current password action behavior:

1. `requireDashboardSession("/account")`.
2. Parse with `changePasswordSchema`.
3. Read `const requestHeaders = await headers()`.
4. Call better-auth `changePassword` with `body.currentPassword`,
   `body.newPassword`, `body.revokeOtherSessions: true`, and
   `headers: requestHeaders`.
5. Revalidate `/account` and the dashboard layout.
6. Return the existing success/error action result shape used by dashboard
   forms.

Email uniqueness uses both a preflight check and write-time error handling:

1. The preflight check gives the user a friendly duplicate-email error.
2. The unique constraint catch handles concurrent requests where another
   account claims the same email between the check and update.

## Boundary Notes

This feature is limited to personal account settings. It does not introduce
staff tables, staff routes, role checks, permissions, invitations, or gym
membership models.

The future-facing design constraint is that account settings remain scoped to
`session.user.id`, so later role work does not need to move personal
email/password management out of `/account`.

## Verification

Focused tests cover:

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

Current verification commands:

- `npm test`
- `npm run typecheck`
- `npm run lint`

Browser verification should also cover `/account` after signing in with the
seeded owner account.

## Related Files

- [lib/auth/index.ts](../../lib/auth/index.ts) - better-auth server instance.
- [lib/auth/client.ts](../../lib/auth/client.ts) - better-auth browser client.
- [lib/auth/server.ts](../../lib/auth/server.ts) - dashboard session helpers.
- [app/(dashboard)/account/page.tsx](<../../app/(dashboard)/account/page.tsx>)
  - account settings page.
- [app/(dashboard)/account/actions.ts](<../../app/(dashboard)/account/actions.ts>)
  - account update server actions.
- [lib/auth/account-service.ts](../../lib/auth/account-service.ts) - account
  email and password orchestration.
- [app/(dashboard)/settings/page.tsx](<../../app/(dashboard)/settings/page.tsx>)
  - existing gym settings route to keep separate from account settings.
- [docs/architecture/auth-and-account-provisioning.md](../architecture/auth-and-account-provisioning.md)
  - current account provisioning model.
- [docs/features/gym-settings.md](./gym-settings.md) - current gym settings
  behavior and route ownership.
