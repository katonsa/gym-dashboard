# Documentation Index

This directory is the project knowledge base. Current reference material lives
in the topic folders below. Completed implementation plans and change notes live
under `archive/` and should be treated as historical context, not current
requirements.

## Start Here

| If you need to...                               | Read                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Understand the product and scope                | [Project Brief](./product/project-brief.md)                                    |
| Run the app locally with demo data              | [Local Database And Seed Data](./setup/local-database-and-seed.md)             |
| Understand login, setup, and owner provisioning | [Auth & Account Provisioning](./architecture/auth-and-account-provisioning.md) |
| Decide where new code belongs                   | [Code Ownership Map](./architecture/code-ownership.md)                         |
| Understand runtime data loading and scoping     | [Runtime Data Source](./architecture/runtime-data-source.md)                   |
| Configure or change the Redis dashboard cache   | [Redis Dashboard Cache](./architecture/redis-dashboard-cache.md)               |
| Review the completed domain refactor            | [Domain Refactor Plan](./architecture/domain-refactor-plan.md)                 |
| See the completed execution checklist           | [Domain Refactor Checklist](./architecture/domain-refactor-checklist.md)       |
| Run tests and quality checks                    | [Testing And Quality](./development/testing-and-quality.md)                    |

## Product

- [Project Brief](./product/project-brief.md) - product problem, target user,
  feature scope, design direction, and success metrics.

## Setup

- [Local Database And Seed Data](./setup/local-database-and-seed.md) - Postgres,
  migrations, local environment variables, seed coverage, demo credentials, and
  reset commands.

## Architecture

- [Code Ownership Map](./architecture/code-ownership.md) - where new
  application, domain, dashboard, report, and feature code should live after
  the refactor.
- [Auth & Account Provisioning](./architecture/auth-and-account-provisioning.md)
  - first-run setup wizard, seed owner, auth page states, member account scope,
    and related files.
- [Runtime Data Source](./architecture/runtime-data-source.md) - owner-scoped
  loaders, runtime writes, mapper responsibilities, and empty-state behavior.
- [Redis Dashboard Cache](./architecture/redis-dashboard-cache.md) - optional
  Upstash Redis configuration, cached loader coverage, key shape, TTL, and
  mutation invalidation behavior.
- [Domain Refactor Plan](./architecture/domain-refactor-plan.md) - completed
  architecture refactor plan, final target layout, and migration record.
- [Domain Refactor Checklist](./architecture/domain-refactor-checklist.md) -
  completed execution checklist and final acceptance record.

## Features

- [Account Settings](./features/account-settings.md) - planned personal
  email/password management and session revocation.
- [CSV Import And Export](./features/csv-import-export.md) - member import,
  export routes, monthly report behavior, and verification notes.
- [Gym Settings](./features/gym-settings.md) - editable gym profile,
  localization, default drop-in fees, and settings actions.
- [Member Management](./features/member-management.md) - roster actions,
  manual member creation, duplicate detection, and member lifecycle workflows.
- [Plan Tier Management](./features/plan-tier-management.md) - plan tier
  creation, editing, activation, deactivation, and constraints.
- [Owner Provisioning](./features/owner-provisioning.md) - first-run setup flow
  details and deployment expectations.
- [Setup Checklist Onboarding](./features/setup-checklist-onboarding.md) -
  onboarding checklist behavior after initial setup.

## Development

- [Testing And Quality](./development/testing-and-quality.md) - test runners,
  when to add tests, integration test requirements, and pre-PR checks.

## Archive

Archived documents are useful when reconstructing why a feature changed, but
they may describe earlier implementation decisions that have since been
superseded.

### Completed Plans

- [Implementation Tasks](./archive/plans/implementation-tasks.md)
- [Database-Backed Dashboard](./archive/plans/db-backed-dashboard.md)
- [Member Actions](./archive/plans/member-actions.md)
- [Pagination](./archive/plans/pagination.md)
- [Database Aggregation](./archive/plans/database-aggregation.md)
- [Payment Lifecycle](./archive/plans/payment-lifecycle.md)
- [Manual Check-In](./archive/plans/manual-checkin.md)
- [Member Renewal](./archive/plans/member-renewal.md)
- [Edit Member Contact](./archive/plans/edit-member-contact.md)
- [Duplicate Member Detection](./archive/plans/duplicate-member-detection.md)
- [Refactoring](./archive/plans/refactoring.md)

### Completed Change Notes

- [Runtime Performance Cleanup](./archive/changes/runtime-performance-cleanup.md)
- [Sonner Toast](./archive/changes/sonner-toast.md)
- [Member Roster Billing Risk Fix](./archive/changes/member-roster-billing-risk-fix.md)
- [shadcn Empty State](./archive/changes/shadcn-empty-state.md)
- [Members Page UX Update](./archive/changes/members-page-ux-update.md)
- [Plan Tier Review Fixes](./archive/changes/plan-tier-review-fixes.md)
- [Mobile Bottom Navigation](./archive/changes/mobile-bottom-navigation.md)

## Documentation Maintenance

- Keep current behavior in the topic folders.
- Move superseded implementation plans or one-time change notes to `archive/`.
- Prefer links to source files when a document describes code ownership.
- Update this index when adding, moving, or archiving documents.
