# Domain Refactor Checklist

Status: Completed execution checklist for
[`Domain Refactor Plan`](./domain-refactor-plan.md).

This remains in place as the completed implementation record. The phase details
below document how the refactor was executed and verified.

## Current Snapshot

Observed after completing all refactor phases:

- `lib/dashboard/` now contains only dashboard-owned loaders, display
  formatters, status styles, navigation, and `read-models/*`.
- Shared types, date helpers, mappers, and pagination utilities live under
  `lib/domain/`.
- Auth-aware action helpers and route revalidation helpers live under
  `lib/application/`.
- Reusable business workflows and schemas live under their domain folders in
  `lib/gyms`, `lib/plans`, `lib/members`, `lib/memberships`, `lib/billing`,
  `lib/attendance`, and `lib/drop-ins`.
- App Router `"use server"` files remain as thin wrappers around those
  application/domain helpers.
- `lib/reports/export-csv.ts` intentionally depends on dashboard read-model
  helpers so monthly exports reuse the same revenue math as `/subscriptions`.
- `lib/dashboard/index.ts` and the temporary compatibility shims have been
  removed.

Historical phase details remain below as an implementation record.

## First PR Target

Recommended first implementation slice:

- [x] Complete Phase 1 in full.
- [x] Move `lib/dashboard/csv.ts` to `lib/reports/csv.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/csv.ts`.
- [x] Move `lib/dashboard/export-csv.ts` to `lib/reports/export-csv.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/export-csv.ts`.
- [x] Move `lib/dashboard/billing.ts` to `lib/billing/periods.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/billing.ts`.
- [x] Move `lib/dashboard/pagination.ts` to `lib/domain/pagination.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/pagination.ts`.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.

This slice is intentionally smaller than full Phase 2 so the team can validate
the shim pattern before moving `types.ts`, `mappers.ts`, or mixed-purpose
formatting utilities.

## Progress Summary

- [x] Phase 0 completed.
- [x] Phase 1 completed.
- [x] Phase 2 completed.
- [x] Phase 3 completed.
- [x] Phase 4 completed.
- [x] Phase 5 completed.
- [x] Phase 6 completed.
- [x] Phase 7 completed.
- [x] Phase 8 completed.
- [x] Phase 9 completed.
- [x] Phase 10 completed.

## Completed Phase 4 Target

Completed Phase 4 implementation slice:

- [x] Start Phase 4 with the gym/settings/application helper slice, not the
      member/payment workflows.
- [x] Move `lib/dashboard/action-helpers.ts` to
      `lib/application/owner-gym-action.ts`.
- [x] Add a temporary re-export shim at `lib/dashboard/action-helpers.ts`.
- [x] Move `lib/dashboard/owner-gym.ts` to `lib/gyms/owner-gym.ts`.
- [x] Add a temporary re-export shim at `lib/dashboard/owner-gym.ts`.
- [x] Move `lib/dashboard/gym-create-action.ts` to
      `lib/gyms/create-gym-action.ts`.
- [x] Add a temporary re-export shim at `lib/dashboard/gym-create-action.ts`.
- [x] Move `lib/dashboard/gym-settings-options.ts` to
      `lib/gyms/settings-options.ts`.
- [x] Add a temporary re-export shim at
      `lib/dashboard/gym-settings-options.ts`.
- [x] Move `lib/dashboard/plan-tier-management.ts` to
      `lib/plans/plan-tier-service.ts`.
- [x] Add a temporary re-export shim at
      `lib/dashboard/plan-tier-management.ts`.
- [x] Create `lib/application/revalidation.ts`.
- [x] Move repeated `revalidatePath` groups in setup/settings flows to the new
      revalidation helper without changing behavior.
- [x] Move member import, renewal, payment, attendance, and drop-in lookup
      reusable services to their domain namespaces.
- [x] Leave `DashboardRouteHref` and the `types.ts` split for Phase 6.
- [x] Run `npm test`.
- [x] Run `npm run test:integration`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.

Why this target was split first:

- the Phase 8 direct-import pass is complete enough to stop using it as the
  active target
- gym/settings helpers had a tighter dependency cluster than member/payment
  workflows
- `lib/application/revalidation.ts` can land alongside these moves and prevent
  duplicated invalidation logic from spreading into the new namespace layout

## Phase 0: Baseline

- [x] Confirm working tree status with `git status --short`.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Record any pre-existing failures before changing files.

## Phase 1: Create Target Folders

- [x] Create `lib/application/`.
- [x] Create `lib/domain/`.
- [x] Create `lib/gyms/schemas/`.
- [x] Create `lib/plans/schemas/`.
- [x] Create `lib/members/schemas/`.
- [x] Create `lib/memberships/schemas/`.
- [x] Create `lib/billing/schemas/`.
- [x] Create `lib/attendance/schemas/`.
- [x] Create `lib/drop-ins/schemas/`.
- [x] Create `lib/reports/`.
- [x] Create `lib/dashboard/read-models/`.
- [x] Run `npm run typecheck`.

## Phase 2: Move Pure Utilities

- [x] Move `lib/dashboard/csv.ts` to `lib/reports/csv.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/csv.ts`.
- [x] Move `lib/dashboard/export-csv.ts` to `lib/reports/export-csv.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/export-csv.ts`.
- [x] Move `lib/dashboard/billing.ts` to `lib/billing/periods.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/billing.ts`.
- [x] Move `lib/dashboard/pagination.ts` to `lib/domain/pagination.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/pagination.ts`.
- [x] Move `lib/dashboard/date-boundaries.ts` to
      `lib/domain/date-boundaries.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/date-boundaries.ts`.
- [x] Move `lib/dashboard/mappers.ts` to `lib/domain/mappers.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/mappers.ts`.
- [x] Move `lib/dashboard/calculations.ts` to
      `lib/memberships/calculations.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/calculations.ts`.
- [x] Create `lib/domain/date-input.ts`.
- [x] Move non-UI date parsing, including `parseDateInput`, out of
      `lib/dashboard/formatters.ts`.
- [x] Leave `lib/dashboard/formatters.ts` for display-only formatting.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.

## Phase 3: Move Schemas

- [x] Move `lib/dashboard/schemas/gym-create-schema.ts` to
      `lib/gyms/schemas/create-gym-schema.ts`.
- [x] Add temporary re-export shim at old gym create schema path.
- [x] Move `lib/dashboard/schemas/gym-settings-schema.ts` to
      `lib/gyms/schemas/settings-schema.ts`.
- [x] Add temporary re-export shim at old gym settings schema path.
- [x] Move `lib/dashboard/schemas/plan-tier-schema.ts` to
      `lib/plans/schemas/plan-tier-schema.ts`.
- [x] Add temporary re-export shim at old plan tier schema path.
- [x] Move `lib/dashboard/schemas/member-create-schema.ts` to
      `lib/members/schemas/create-member-schema.ts`.
- [x] Add temporary re-export shim at old member create schema path.
- [x] Move `lib/dashboard/schemas/update-member-contact-schema.ts` to
      `lib/members/schemas/update-contact-schema.ts`.
- [x] Add temporary re-export shim at old contact schema path.
- [x] Move `lib/dashboard/schemas/change-plan-schema.ts` to
      `lib/memberships/schemas/change-plan-schema.ts`.
- [x] Add temporary re-export shim at old change plan schema path.
- [x] Move `lib/dashboard/schemas/renew-membership-schema.ts` to
      `lib/memberships/schemas/renew-membership-schema.ts`.
- [x] Add temporary re-export shim at old renewal schema path.
- [x] Move `lib/dashboard/schemas/mark-paid-schema.ts` to
      `lib/billing/schemas/mark-paid-schema.ts`.
- [x] Add temporary re-export shim at old mark-paid schema path.
- [x] Move `lib/dashboard/schemas/void-payment-schema.ts` to
      `lib/billing/schemas/void-payment-schema.ts`.
- [x] Add temporary re-export shim at old void-payment schema path.
- [x] Move `lib/dashboard/schemas/log-checkin-schema.ts` to
      `lib/attendance/schemas/log-checkin-schema.ts`.
- [x] Add temporary re-export shim at old check-in schema path.
- [x] Move `lib/dashboard/schemas/drop-in-create-schema.ts` to
      `lib/drop-ins/schemas/create-drop-in-schema.ts`.
- [x] Add temporary re-export shim at old drop-in schema path.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.

## Phase 4: Move Existing Domain Services

- [x] Move `lib/dashboard/action-helpers.ts` to
      `lib/application/owner-gym-action.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/action-helpers.ts`.
- [x] Move `lib/dashboard/owner-gym.ts` to `lib/gyms/owner-gym.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/owner-gym.ts`.
- [x] Move `lib/dashboard/gym-create-action.ts` to
      `lib/gyms/create-gym-action.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/gym-create-action.ts`.
- [x] Move `lib/dashboard/gym-settings-options.ts` to
      `lib/gyms/settings-options.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/gym-settings-options.ts`.
- [x] Move `lib/dashboard/plan-tier-management.ts` to
      `lib/plans/plan-tier-service.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/plan-tier-management.ts`.
- [x] Move `lib/dashboard/member-contact-lifecycle.ts` to
      `lib/members/contact-service.ts`.
- [x] Add temporary re-export shim at old contact lifecycle path.
- [x] Move `lib/dashboard/member-duplicate-detection.ts` to
      `lib/members/duplicate-detection.ts`.
- [x] Add temporary re-export shim at old duplicate detection path.
- [x] Move `lib/dashboard/member-import.ts` to `lib/members/import.ts`.
- [x] Add temporary re-export shim at `lib/dashboard/member-import.ts`.
- [x] Move `lib/dashboard/renewal-lifecycle.ts` to
      `lib/memberships/renewal-service.ts`.
- [x] Add temporary re-export shim at old renewal lifecycle path.
- [x] Move `lib/dashboard/payment-lifecycle.ts` to
      `lib/billing/payment-service.ts`.
- [x] Add temporary re-export shim at old payment lifecycle path.
- [x] Move `lib/dashboard/attendance-lifecycle.ts` to
      `lib/attendance/check-in-service.ts`.
- [x] Add temporary re-export shim at old attendance lifecycle path.
- [x] Move `lib/dashboard/drop-in-visitor-lookup.ts` to
      `lib/drop-ins/visitor-lookup.ts`.
- [x] Add temporary re-export shim at old visitor lookup path.
- [x] Create `lib/application/revalidation.ts`.
- [x] Move repeated `revalidatePath` groups into application-level helpers.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.

Phase note:

- Land `lib/application/revalidation.ts` in this refactor, not in a later
  cleanup pass. The current actions already duplicate the same route groups.

## Phase 5: Move Dashboard Read Models

- [x] Move `lib/dashboard/aggregate-queries.ts` to
      `lib/dashboard/read-models/aggregate-queries.ts`.
- [x] Move `lib/dashboard/aggregate-types.ts` to
      `lib/dashboard/read-models/aggregate-types.ts`.
- [x] Move `lib/dashboard/aggregates.ts` to
      `lib/dashboard/read-models/aggregates.ts`.
- [x] Move `lib/dashboard/subscription-aggregates.ts` to
      `lib/dashboard/read-models/subscription-aggregates.ts`.
- [x] Move `lib/dashboard/drop-in-aggregates.ts` to
      `lib/dashboard/read-models/drop-in-aggregates.ts`.
- [x] Move `lib/dashboard/member-roster.ts` to
      `lib/dashboard/read-models/member-roster.ts`.
- [x] Move `lib/dashboard/query-scopes.ts` to
      `lib/dashboard/read-models/query-scopes.ts`.
- [x] Move `lib/dashboard/cache-params.ts` to
      `lib/dashboard/read-models/cache-params.ts`.
- [x] Add temporary re-export shims for all old read-model paths.
- [x] Update `lib/dashboard/loaders.ts` imports to prefer new read-model paths.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.

## Phase 6: Split Types And Navigation

- [x] Create `lib/domain/types.ts`.
- [x] Move reusable entity/value types out of `lib/dashboard/types.ts`.
- [x] Create `lib/application/dashboard-routes.ts`.
- [x] Move `DashboardRouteHref` and safe dashboard href constants out of
      `lib/dashboard/types.ts`.
- [x] Create `lib/dashboard/navigation.ts`.
- [x] Move dashboard route labels/descriptions into navigation file.
- [x] Update auth modules to import safe route hrefs from
      `lib/application/dashboard-routes.ts`, not `lib/dashboard`.
- [x] Create `lib/dashboard/read-models/types.ts`.
- [x] Move dashboard summary and alert types into read-model types.
- [x] Keep `lib/dashboard/index.ts` only as a temporary compatibility barrel.
- [x] Update imports in app, components, tests, and docs where practical.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.

Phase note:

- This is the point where auth must stop importing from `@/lib/dashboard`.
- Do not remove old exports until `lib/auth/server.ts` and any other auth-safe
  route helpers import from `lib/application/dashboard-routes.ts`.
- Keep `lib/dashboard/index.ts` as a temporary compatibility barrel through this
  phase if needed. Do not spend this phase converting every existing barrel
  import.

## Phase 7: Extract Inline Server Action Workflows

- [x] Create `lib/members/create-member-service.ts`.
- [x] Move member creation transaction out of
      `app/(dashboard)/members/member-actions.ts`.
- [x] Create `lib/members/status-service.ts`.
- [x] Move member status transition out of
      `app/(dashboard)/members/member-actions.ts`.
- [x] Create `lib/members/import-service.ts`.
- [x] Move import preview loading/validation orchestration out of
      `app/(dashboard)/members/import-actions.ts`.
- [x] Move import confirmation transaction out of
      `app/(dashboard)/members/import-actions.ts`.
- [x] Create `lib/memberships/plan-change-service.ts`.
- [x] Move plan change transaction out of
      `app/(dashboard)/members/membership-actions.ts`.
- [x] Create `lib/drop-ins/visitor-contact.ts`.
- [x] Move `normalizeDropInVisitorContact` out of dashboard read-model code.
- [x] Create `lib/drop-ins/create-visit-service.ts`.
- [x] Move drop-in create write out of `app/(dashboard)/drop-ins/actions.ts`.
- [x] Create `lib/gyms/settings-service.ts`.
- [x] Move gym settings update out of `app/(dashboard)/settings/actions.ts`.
- [x] Confirm Server Action files are thin wrappers.
- [x] Run `npm test`.
- [x] Run `npm run test:integration`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.

Phase note:

- `normalizeDropInVisitorContact` moves here with the drop-in write workflow,
  not in Phase 5. It serves the write path, even though it currently lives in a
  dashboard aggregate file.

## Phase 8: Migrate Imports Away From Old Dashboard Paths

- [x] Run `rg '@/lib/dashboard'`.
- [x] Update app imports that now belong to domain folders.
- [x] Update component imports that now belong to domain folders.
- [x] Update API export route imports that now belong to `lib/reports`.
- [x] Update test imports that now belong to domain folders.
- [x] Confirm remaining `@/lib/dashboard` imports are dashboard-only:
      loaders, display formatters, status styles, navigation, and read models.
- [x] Confirm no domain service imports `@/lib/dashboard`.
- [x] Confirm all non-UI date parsing imports point to `lib/domain/date-input`.
- [x] Confirm all Prisma-to-domain mapper imports point to
      `lib/domain/mappers`.
- [x] Run `npm test`.
- [x] Run `npm run test:integration`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.

Phase note:

- The broad `rg '@/lib/dashboard'` audit now only shows dashboard-owned
  modules: loaders, display formatters, status styles, navigation, and
  `read-models/*`.

## Phase 9: Remove Compatibility Shims

- [x] Delete old re-export shims under `lib/dashboard`.
- [x] Delete `lib/dashboard/index.ts`.
- [x] Confirm `lib/dashboard` contains only:
      `loaders.ts`, display-only `formatters.ts`, `status-styles.ts`,
      `navigation.ts`, and `read-models/*`.
- [x] Run `rg "@/lib/dashboard/(billing|calculations|schemas|member|payment|attendance|plan|owner|gym|csv|export|date|pagination|mappers|index)"`.
- [x] Confirm the command returns no active imports.
- [x] Run `npm test`.
- [x] Run `npm run test:integration`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.

## Phase 10: Documentation Updates

- [x] Update `README.md` project layout.
- [x] Update `docs/README.md` architecture and feature links if needed.
- [x] Update `docs/architecture/runtime-data-source.md` file path references.
- [x] Update `docs/architecture/redis-dashboard-cache.md` file path references.
- [x] Update `docs/features/member-management.md` file path references.
- [x] Update `docs/features/plan-tier-management.md` file path references.
- [x] Update `docs/features/gym-settings.md` file path references.
- [x] Update `docs/features/csv-import-export.md` file path references.
- [x] Update `docs/features/setup-checklist-onboarding.md` file path references.
- [x] Mark this checklist complete in place instead of moving it to
      `docs/archive/plans/`.

## Final Acceptance

- [x] `lib/dashboard` is dashboard-only.
- [x] Server Actions are thin wrappers around domain services.
- [x] Domain services can be called without importing dashboard code.
- [x] Domain services do not import anything from `@/lib/dashboard`.
- [x] `app/(dashboard)/members/import-actions.ts` delegates preview and confirm
      workflows to `lib/members/import-service.ts`.
- [x] `lib/dashboard/index.ts` has been removed.
- [x] No user-visible behavior changed.
- [x] `npm test` passes.
- [x] `npm run test:integration` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.
- [x] Docs point to the new architecture.
