# Owner Provisioning — First-Run Setup Wizard

Status: Active — replaces seed-only provisioning.

## Problem

Owner accounts can only be created through the seed script or direct Better Auth
API calls. The sign-in page assumes an account already exists, and the dashboard
shows a dead-end "ask an admin" message when a signed-in user has no gym. There
is no self-serve path.

## Solution

A **first-run setup wizard** embedded in the sign-in page. When no user exists in
the database, the sign-in page shows a combined account + gym creation form
instead of the sign-in form. After the owner is created, subsequent visits show
the normal sign-in form.

This is a single-tenant system — only one gym owner exists.

## State Machine

The sign-in page uses `getAuthPageState()` to determine what to render:

```
missing-config ──> Show config error (env vars missing)
database-unavailable ──> Show DB connection error
setup-required ──> Show setup wizard (no users exist)
ready ──> Show sign-in form (users exist)
```

The check order is:

1. `DATABASE_URL` and `BETTER_AUTH_SECRET` must be set.
2. Database must be reachable (`SELECT 1`).
3. At least one user must exist (`user.count({ take: 1 })`).
4. If all checks pass, the sign-in form is shown.

## User Flows

### First run (no users)

1. Visit `/sign-in`.
2. Page detects `setup-required` state.
3. Setup wizard renders with account fields (name, email, password) and gym
   fields (gym name, timezone, currency, drop-in fee).
4. User fills the form and submits.
5. `authClient.signUp.email()` creates the account and signs in.
6. The `createGym` server action creates the gym row.
7. User is redirected to the dashboard.

### Normal sign-in (users exist)

1. Visit `/sign-in`.
2. Page detects `ready` state.
3. Sign-in form renders — standard email/password.

### Edge case: user exists but no gym

This can happen if a user was created programmatically without a gym, or if the
gym was deleted. The dashboard layout handles this by showing an inline gym
creation form (`GymSetupShell`) instead of the dead-end "ask an admin" message.

## Gym Creation Defaults

The setup wizard pre-fills gym fields with sensible defaults matching the seed
data:

| Field       | Default        |
| ----------- | -------------- |
| Timezone    | `Asia/Jakarta` |
| Currency    | `IDR`          |
| Drop-in fee | `50000`        |

All fields are editable before submission.

## Idempotency

The gym creation action checks whether the signed-in user already owns a gym. If
so, it returns success without creating a duplicate. This handles double-submit
scenarios safely.

## Data Model

No Prisma schema changes. The wizard creates:

- A `User` row via Better Auth's `signUpEmail` API (handles password hashing).
- A `Gym` row with `ownerId` set to the new user's ID.

## Files

| File                                         | Purpose                                      |
| -------------------------------------------- | -------------------------------------------- |
| `lib/auth/page-state.tsx`                    | `getAuthPageState()` and `AuthFallbackState` |
| `lib/auth/schemas/setup-schema.ts`           | Zod schema for the setup wizard form         |
| `lib/dashboard/schemas/gym-create-schema.ts` | Zod schema for gym-only creation             |
| `lib/dashboard/gym-create-action.ts`         | Server action for gym creation               |
| `app/(auth)/sign-in/setup-wizard.tsx`        | Setup wizard client component                |
| `components/dashboard/gym-setup-shell.tsx`   | Inline gym setup for edge case               |

## Related Docs

- [Auth & Account Provisioning](../architecture/auth-and-account-provisioning.md)
- [Local Database And Seed Data](../setup/local-database-and-seed.md)
- [Gym Settings](./gym-settings.md)
- [Setup Checklist Onboarding](./setup-checklist-onboarding.md)
