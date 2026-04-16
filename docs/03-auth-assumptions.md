# Auth & Account Provisioning

Status: Active — applies to the current milestone.

This document describes how user accounts are created and managed in the gym dashboard. It covers the assumptions made during the database-backed dashboard milestone.

## Owner Accounts

Owner accounts are **not** created through a public sign-up page. There is no `/sign-up` route.

Provisioning methods:

| Method | When |
|--------|------|
| **Seed script** | Local development and demo environments. Run `npm run db:seed` after applying migrations. |
| **Admin tooling** | Future consideration. Not built in this milestone. |
| **Better Auth server API** | Programmatic creation via `auth.api.signUpEmail()` for custom provisioning scripts. |

### Demo Owner (Local Development)

The seed script creates a single demo owner account:

| Field | Value |
|-------|-------|
| **Name** | Demo Owner |
| **Email** | `owner@jkt-strength.local` |
| **Password** | `owner-password-123` |

This account owns the seeded gym ("JKT Strength House") and has full dashboard access.

> **Warning:** These credentials exist only in the seed script and are intended for local development only. Do not use them in any deployed environment.

## Member Accounts

Members **do not** have login accounts. Member records are data managed by the authenticated owner/admin through the dashboard.

| Capability | Status |
|-----------|--------|
| Member self-registration | Out of scope |
| Member login accounts | Out of scope |
| Member portal | Out of scope |
| Manual member entry by owner | In scope — delivered in this milestone |

## What Is Out of Scope

- Public `/sign-up` page — deferred until a future owner or member onboarding flow is scoped.
- Role-based staff permissions — only the owner role is supported in this milestone.
- Email-based account recovery — not built; owner accounts are provisioned directly.
- OAuth / social login — not configured; email + password only.

## Related Files

- [lib/auth/index.ts](../lib/auth/index.ts) — Better Auth server instance.
- [lib/auth/client.ts](../lib/auth/client.ts) — Better Auth client for browser-side auth calls.
- [lib/auth/next-path.ts](../lib/auth/next-path.ts) — Safe `next` query param validation for post-login redirect.
- [app/(auth)/sign-in/page.tsx](../app/(auth)/sign-in/page.tsx) — Sign-in page.
- [prisma/seed.ts](../prisma/seed.ts) — Seed script that creates the demo owner.
