# Auth & Account Provisioning

Status: Active — applies to the current milestone.

This document describes how user accounts are created and managed in the gym dashboard.

## Owner Accounts

### First-Run Setup Wizard (Primary)

When no user exists in the database, the sign-in page automatically shows a
**setup wizard** instead of the sign-in form. The wizard creates the owner
account and gym in one flow:

1. The sign-in page calls `getAuthPageState()`, which checks for users.
2. If no users exist, the page renders the setup wizard (`setup-required` state).
3. The owner fills in account details (name, email, password) and gym details
   (gym name, timezone, currency, drop-in fee).
4. `authClient.signUp.email()` creates the account and signs in.
5. A server action creates the gym row linked to the new owner.
6. The owner is redirected to the dashboard.

This is the primary provisioning path for new deployments. No admin intervention
or seed script is required.

See [Owner Provisioning](../features/owner-provisioning.md) for full details.

### Other Provisioning Methods

| Method                     | When                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| **First-run wizard**       | New deployments with an empty database. Shown automatically on `/sign-in`.                |
| **Seed script**            | Local development and demo environments. Run `npm run db:seed` after applying migrations. |
| **Better Auth server API** | Programmatic creation via `auth.api.signUpEmail()` for custom provisioning scripts.       |

### Demo Owner (Local Development)

The seed script creates a single demo owner account:

| Field        | Value                      |
| ------------ | -------------------------- |
| **Name**     | Demo Owner                 |
| **Email**    | `owner@jkt-strength.local` |
| **Password** | `owner-password-123`       |

This account owns the seeded gym ("JKT Strength House") and has full dashboard access.

> **Warning:** These credentials exist only in the seed script and are intended for local development only. Do not use them in any deployed environment.

### Sign-In Page State Machine

The sign-in page uses `getAuthPageState()` to determine what to render:

| State                  | Condition                                    | Rendered            |
| ---------------------- | -------------------------------------------- | ------------------- |
| `missing-config`       | `DATABASE_URL` or `BETTER_AUTH_SECRET` unset | Configuration error |
| `database-unavailable` | Database unreachable                         | Connection error    |
| `setup-required`       | Database reachable, no users exist           | Setup wizard        |
| `ready`                | Database reachable, at least one user exists | Sign-in form        |

### Edge Case: User Without Gym

If a signed-in user has no gym (partial seed, manual user creation), the
dashboard layout shows an inline gym creation form instead of a dead-end message.

## Member Accounts

Members **do not** have login accounts. Member records are data managed by the authenticated owner/admin through the dashboard.

| Capability                   | Status                                 |
| ---------------------------- | -------------------------------------- |
| Member self-registration     | Out of scope                           |
| Member login accounts        | Out of scope                           |
| Member portal                | Out of scope                           |
| Manual member entry by owner | In scope — delivered in this milestone |

## What Is Out of Scope

- Role-based staff permissions — only the owner role is supported in this milestone.
- Email-based account recovery — not built; owner accounts can be reset via seed or direct DB action.
- OAuth / social login — not configured; email + password only.
- Multi-owner support — the system is single-tenant; only one gym owner exists.

## Related Files

- [lib/auth/index.ts](../../lib/auth/index.ts) — Better Auth server instance.
- [lib/auth/client.ts](../../lib/auth/client.ts) — Better Auth client for browser-side auth calls.
- [lib/auth/page-state.tsx](../../lib/auth/page-state.tsx) — Sign-in page state detection (`getAuthPageState`).
- [lib/auth/schemas/setup-schema.ts](../../lib/auth/schemas/setup-schema.ts) — Zod schema for the setup wizard.
- [lib/auth/next-path.ts](../../lib/auth/next-path.ts) — Safe `next` query param validation for post-login redirect.
- [app/(auth)/sign-in/page.tsx](<../../app/(auth)/sign-in/page.tsx>) — Sign-in page (renders wizard or sign-in form).
- [app/(auth)/sign-in/setup-wizard.tsx](<../../app/(auth)/sign-in/setup-wizard.tsx>) — First-run setup wizard component.
- [lib/gyms/create-gym-action.ts](../../lib/gyms/create-gym-action.ts) — Server action for gym creation.
- [prisma/seed.ts](../../prisma/seed.ts) — Seed script that creates the demo owner.
