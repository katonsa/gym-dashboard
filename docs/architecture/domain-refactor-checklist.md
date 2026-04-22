# Domain Refactor Checklist

Status: Proposed task checklist for executing
[`Domain Refactor Plan`](./domain-refactor-plan.md).

Use this as the working checklist during implementation. Keep each phase small
enough that tests, typecheck, and lint can pass before moving to the next phase.

## Phase 0: Baseline

- [ ] Confirm working tree status with `git status --short`.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Record any pre-existing failures before changing files.

## Phase 1: Create Target Folders

- [ ] Create `lib/application/`.
- [ ] Create `lib/domain/`.
- [ ] Create `lib/gyms/schemas/`.
- [ ] Create `lib/plans/schemas/`.
- [ ] Create `lib/members/schemas/`.
- [ ] Create `lib/memberships/schemas/`.
- [ ] Create `lib/billing/schemas/`.
- [ ] Create `lib/attendance/schemas/`.
- [ ] Create `lib/drop-ins/schemas/`.
- [ ] Create `lib/reports/`.
- [ ] Create `lib/dashboard/read-models/`.
- [ ] Run `npm run typecheck`.

## Phase 2: Move Pure Utilities

- [ ] Move `lib/dashboard/billing.ts` to `lib/billing/periods.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/billing.ts`.
- [ ] Move `lib/dashboard/calculations.ts` to
      `lib/memberships/calculations.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/calculations.ts`.
- [ ] Move `lib/dashboard/date-boundaries.ts` to
      `lib/domain/date-boundaries.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/date-boundaries.ts`.
- [ ] Create `lib/domain/date-input.ts`.
- [ ] Move non-UI date parsing, including `parseDateInput`, out of
      `lib/dashboard/formatters.ts`.
- [ ] Leave `lib/dashboard/formatters.ts` for display-only formatting.
- [ ] Move `lib/dashboard/mappers.ts` to `lib/domain/mappers.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/mappers.ts`.
- [ ] Move `lib/dashboard/pagination.ts` to `lib/domain/pagination.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/pagination.ts`.
- [ ] Move `lib/dashboard/csv.ts` to `lib/reports/csv.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/csv.ts`.
- [ ] Move `lib/dashboard/export-csv.ts` to `lib/reports/export-csv.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/export-csv.ts`.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

## Phase 3: Move Schemas

- [ ] Move `lib/dashboard/schemas/gym-create-schema.ts` to
      `lib/gyms/schemas/create-gym-schema.ts`.
- [ ] Add temporary re-export shim at old gym create schema path.
- [ ] Move `lib/dashboard/schemas/gym-settings-schema.ts` to
      `lib/gyms/schemas/settings-schema.ts`.
- [ ] Add temporary re-export shim at old gym settings schema path.
- [ ] Move `lib/dashboard/schemas/plan-tier-schema.ts` to
      `lib/plans/schemas/plan-tier-schema.ts`.
- [ ] Add temporary re-export shim at old plan tier schema path.
- [ ] Move `lib/dashboard/schemas/member-create-schema.ts` to
      `lib/members/schemas/create-member-schema.ts`.
- [ ] Add temporary re-export shim at old member create schema path.
- [ ] Move `lib/dashboard/schemas/update-member-contact-schema.ts` to
      `lib/members/schemas/update-contact-schema.ts`.
- [ ] Add temporary re-export shim at old contact schema path.
- [ ] Move `lib/dashboard/schemas/change-plan-schema.ts` to
      `lib/memberships/schemas/change-plan-schema.ts`.
- [ ] Add temporary re-export shim at old change plan schema path.
- [ ] Move `lib/dashboard/schemas/renew-membership-schema.ts` to
      `lib/memberships/schemas/renew-membership-schema.ts`.
- [ ] Add temporary re-export shim at old renewal schema path.
- [ ] Move `lib/dashboard/schemas/mark-paid-schema.ts` to
      `lib/billing/schemas/mark-paid-schema.ts`.
- [ ] Add temporary re-export shim at old mark-paid schema path.
- [ ] Move `lib/dashboard/schemas/void-payment-schema.ts` to
      `lib/billing/schemas/void-payment-schema.ts`.
- [ ] Add temporary re-export shim at old void-payment schema path.
- [ ] Move `lib/dashboard/schemas/log-checkin-schema.ts` to
      `lib/attendance/schemas/log-checkin-schema.ts`.
- [ ] Add temporary re-export shim at old check-in schema path.
- [ ] Move `lib/dashboard/schemas/drop-in-create-schema.ts` to
      `lib/drop-ins/schemas/create-drop-in-schema.ts`.
- [ ] Add temporary re-export shim at old drop-in schema path.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

## Phase 4: Move Existing Domain Services

- [ ] Move `lib/dashboard/action-helpers.ts` to
      `lib/application/owner-gym-action.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/action-helpers.ts`.
- [ ] Move `lib/dashboard/owner-gym.ts` to `lib/gyms/owner-gym.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/owner-gym.ts`.
- [ ] Move `lib/dashboard/gym-create-action.ts` to
      `lib/gyms/create-gym-action.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/gym-create-action.ts`.
- [ ] Move `lib/dashboard/gym-settings-options.ts` to
      `lib/gyms/settings-options.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/gym-settings-options.ts`.
- [ ] Move `lib/dashboard/plan-tier-management.ts` to
      `lib/plans/plan-tier-service.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/plan-tier-management.ts`.
- [ ] Move `lib/dashboard/member-contact-lifecycle.ts` to
      `lib/members/contact-service.ts`.
- [ ] Add temporary re-export shim at old contact lifecycle path.
- [ ] Move `lib/dashboard/member-duplicate-detection.ts` to
      `lib/members/duplicate-detection.ts`.
- [ ] Add temporary re-export shim at old duplicate detection path.
- [ ] Move `lib/dashboard/member-import.ts` to `lib/members/import.ts`.
- [ ] Add temporary re-export shim at `lib/dashboard/member-import.ts`.
- [ ] Move `lib/dashboard/renewal-lifecycle.ts` to
      `lib/memberships/renewal-service.ts`.
- [ ] Add temporary re-export shim at old renewal lifecycle path.
- [ ] Move `lib/dashboard/payment-lifecycle.ts` to
      `lib/billing/payment-service.ts`.
- [ ] Add temporary re-export shim at old payment lifecycle path.
- [ ] Move `lib/dashboard/attendance-lifecycle.ts` to
      `lib/attendance/check-in-service.ts`.
- [ ] Add temporary re-export shim at old attendance lifecycle path.
- [ ] Move `lib/dashboard/drop-in-visitor-lookup.ts` to
      `lib/drop-ins/visitor-lookup.ts`.
- [ ] Add temporary re-export shim at old visitor lookup path.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

## Phase 5: Move Dashboard Read Models

- [ ] Move `lib/dashboard/aggregate-queries.ts` to
      `lib/dashboard/read-models/aggregate-queries.ts`.
- [ ] Move `lib/dashboard/aggregate-types.ts` to
      `lib/dashboard/read-models/aggregate-types.ts`.
- [ ] Move `lib/dashboard/aggregates.ts` to
      `lib/dashboard/read-models/aggregates.ts`.
- [ ] Move `lib/dashboard/subscription-aggregates.ts` to
      `lib/dashboard/read-models/subscription-aggregates.ts`.
- [ ] Move `lib/dashboard/drop-in-aggregates.ts` to
      `lib/dashboard/read-models/drop-in-aggregates.ts`.
- [ ] Move `lib/dashboard/member-roster.ts` to
      `lib/dashboard/read-models/member-roster.ts`.
- [ ] Move `lib/dashboard/query-scopes.ts` to
      `lib/dashboard/read-models/query-scopes.ts`.
- [ ] Move `lib/dashboard/cache-params.ts` to
      `lib/dashboard/read-models/cache-params.ts`.
- [ ] Add temporary re-export shims for all old read-model paths.
- [ ] Update `lib/dashboard/loaders.ts` imports to prefer new read-model paths.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

## Phase 6: Split Types And Navigation

- [ ] Create `lib/domain/types.ts`.
- [ ] Move reusable entity/value types out of `lib/dashboard/types.ts`.
- [ ] Create `lib/application/dashboard-routes.ts`.
- [ ] Move `DashboardRouteHref` and safe dashboard href constants out of
      `lib/dashboard/types.ts`.
- [ ] Create `lib/dashboard/navigation.ts`.
- [ ] Move dashboard route labels/descriptions into navigation file.
- [ ] Update auth modules to import safe route hrefs from
      `lib/application/dashboard-routes.ts`, not `lib/dashboard`.
- [ ] Create `lib/dashboard/read-models/types.ts`.
- [ ] Move dashboard summary and alert types into read-model types.
- [ ] Keep `lib/dashboard/index.ts` only as a temporary compatibility barrel.
- [ ] Update imports in app, components, tests, and docs where practical.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

## Phase 7: Extract Inline Server Action Workflows

- [ ] Create `lib/members/create-member-service.ts`.
- [ ] Move member creation transaction out of
      `app/(dashboard)/members/member-actions.ts`.
- [ ] Create `lib/members/status-service.ts`.
- [ ] Move member status transition out of
      `app/(dashboard)/members/member-actions.ts`.
- [ ] Create `lib/members/import-service.ts`.
- [ ] Move import preview loading/validation orchestration out of
      `app/(dashboard)/members/import-actions.ts`.
- [ ] Move import confirmation transaction out of
      `app/(dashboard)/members/import-actions.ts`.
- [ ] Create `lib/memberships/plan-change-service.ts`.
- [ ] Move plan change transaction out of
      `app/(dashboard)/members/membership-actions.ts`.
- [ ] Create `lib/drop-ins/visitor-contact.ts`.
- [ ] Move `normalizeDropInVisitorContact` out of dashboard read-model code.
- [ ] Create `lib/drop-ins/create-visit-service.ts`.
- [ ] Move drop-in create write out of `app/(dashboard)/drop-ins/actions.ts`.
- [ ] Create `lib/gyms/settings-service.ts`.
- [ ] Move gym settings update out of `app/(dashboard)/settings/actions.ts`.
- [ ] Confirm Server Action files are thin wrappers.
- [ ] Run `npm test`.
- [ ] Run `npm run test:integration`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

## Phase 8: Migrate Imports Away From Old Dashboard Paths

- [ ] Run `rg "@/lib/dashboard"`.
- [ ] Update app imports that now belong to domain folders.
- [ ] Update component imports that now belong to domain folders.
- [ ] Update API export route imports that now belong to `lib/reports`.
- [ ] Update test imports that now belong to domain folders.
- [ ] Confirm remaining `@/lib/dashboard` imports are dashboard-only:
      loaders, display formatters, status styles, navigation, and read models.
- [ ] Confirm no domain service imports `@/lib/dashboard`.
- [ ] Confirm all non-UI date parsing imports point to `lib/domain/date-input`.
- [ ] Confirm all Prisma-to-domain mapper imports point to
      `lib/domain/mappers`.
- [ ] Run `npm test`.
- [ ] Run `npm run test:integration`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.

## Phase 9: Remove Compatibility Shims

- [ ] Delete old re-export shims under `lib/dashboard`.
- [ ] Delete `lib/dashboard/index.ts`.
- [ ] Confirm `lib/dashboard` contains only:
      `loaders.ts`, display-only `formatters.ts`, `status-styles.ts`,
      `navigation.ts`, and `read-models/*`.
- [ ] Run `rg "@/lib/dashboard/(billing|calculations|schemas|member|payment|attendance|plan|owner|gym|csv|export|date|pagination|mappers|index)"`.
- [ ] Confirm the command returns no active imports.
- [ ] Run `npm test`.
- [ ] Run `npm run test:integration`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.

## Phase 10: Documentation Updates

- [ ] Update `README.md` project layout.
- [ ] Update `docs/README.md` architecture and feature links if needed.
- [ ] Update `docs/architecture/runtime-data-source.md` file path references.
- [ ] Update `docs/architecture/redis-dashboard-cache.md` file path references.
- [ ] Update `docs/features/member-management.md` file path references.
- [ ] Update `docs/features/plan-tier-management.md` file path references.
- [ ] Update `docs/features/gym-settings.md` file path references.
- [ ] Update `docs/features/csv-import-export.md` file path references.
- [ ] Update `docs/features/setup-checklist-onboarding.md` file path references.
- [ ] Move this checklist to `docs/archive/plans/` after completion, or mark it
      complete in place if it should remain current.

## Final Acceptance

- [ ] `lib/dashboard` is dashboard-only.
- [ ] Server Actions are thin wrappers around domain services.
- [ ] Domain services can be called without importing dashboard code.
- [ ] Domain services do not import anything from `@/lib/dashboard`.
- [ ] `app/(dashboard)/members/import-actions.ts` delegates preview and confirm
      workflows to `lib/members/import-service.ts`.
- [ ] `lib/dashboard/index.ts` has been removed.
- [ ] No user-visible behavior changed.
- [ ] `npm test` passes.
- [ ] `npm run test:integration` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Docs point to the new architecture.
