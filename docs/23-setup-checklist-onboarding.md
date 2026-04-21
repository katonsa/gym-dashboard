# Setup Checklist — Guided Onboarding

Status: Active.

## Problem

After the first-run wizard creates the owner account and gym, the dashboard
shows passive "Setup gaps" cards describing what's missing (no members, no
memberships, no drop-ins) but offers no way to fix them. The owner must
navigate to separate pages to create plans, add members, and log drop-ins.

## Solution

An inline **setup checklist** on the dashboard overview page that walks the
owner through three steps:

1. **Create your first plan** — inline plan tier creation form.
2. **Add your first member** — reuse the existing `MemberCreateForm`.
3. **Log your first drop-in** — reuse the existing `DropInEntryForm`.

The first incomplete step is auto-expanded. When a step completes, the server
action calls `revalidatePath("/")`, the page re-renders with fresh setup state,
and the checklist auto-advances to the next incomplete step. When all steps are
done, the checklist disappears entirely.

## Design Decisions

### Inline checklist, not a separate route

The dashboard overview already shows setup gaps. Replacing those passive cards
with an active checklist keeps the user on the main page and avoids duplicating
form logic on a separate `/setup` route.

### Derived state, not persisted onboarding flags

Setup state is derived from data counts via `getOverviewSetupState()`. No
`onboardingComplete` flag on the Gym model — that would create a stale-data
sync problem. The existing approach is correct.

### Props-driven step progression, not React state

The active step is derived from `setupState` props in the `SetupChecklist`
component:

```typescript
const activeStep = !hasPlanTiers ? 1
  : !hasMembers ? 2
  : !hasDropIns ? 3
  : null
```

No React state management is needed. When `revalidatePath("/")` triggers a
server re-render, the component receives fresh props and auto-advances.

### Reuse existing forms and actions

- `SetupPlanTierForm` — simplified inline version of the plan tier create form
  (omits sort order and active toggle, hard-codes sensible defaults).
- `MemberCreateForm` — used directly as-is.
- `DropInEntryForm` — used directly as-is.
- All server actions (`createPlanTier`, `createMember`, `createDropInVisit`)
  are reused without changes.

## Step Behavior

| Step state | Visual |
| ---------- | ------ |
| Complete | Green checkmark, muted title with strikethrough |
| Active | Numbered badge, expanded with inline form |
| Pending | Gray circle, muted title |

Step 2 is effectively locked when step 1 is incomplete — the `MemberCreateForm`
already shows "Add an active plan before starting memberships" when no active
plan tiers exist.

## Setup State

`getOverviewSetupState()` returns:

```typescript
{
  hasPlanTiers: boolean   // planTier.count > 0
  hasMembers: boolean     // member.count > 0
  hasMemberships: boolean // membership.count > 0
  hasDropIns: boolean     // dropInVisit._sum.visitCount > 0
}
```

The checklist only checks `hasPlanTiers`, `hasMembers`, and `hasDropIns`.
`hasMemberships` is not a separate step because memberships are created
implicitly when a member is assigned a plan.

## Data Loading

`loadSetupChecklistData()` fetches the data needed by the checklist forms:

- Plan tiers (for the member form's plan selector)
- Drop-in visitor lookup options (for the drop-in form's visitor combobox)
- Next sort order (for the plan tier form's hidden sort field)

This runs in parallel with the other dashboard data loaders via `Promise.all`,
so it adds no sequential latency.

## Files

| File                                                  | Purpose                                |
| ----------------------------------------------------- | -------------------------------------- |
| `components/dashboard/setup-checklist.tsx`            | 3-step guided checklist client component |
| `components/dashboard/setup-plan-tier-form.tsx`       | Simplified inline plan tier creation form |
| `lib/dashboard/aggregate-types.ts`                    | `OverviewSetupState` with `hasPlanTiers` |
| `lib/dashboard/aggregate-queries.ts`                  | `getOverviewSetupState()` with plan tier count |
| `lib/dashboard/loaders.ts`                            | `loadSetupChecklistData()` loader |
| `app/(dashboard)/page.tsx`                            | Integration point: checklist replaces setup gaps |

## Related Docs

- [Owner Provisioning](./22-owner-provisioning-plan.md)
- [Plan Tier Management](./20-plan-tier-management.md)
- [Gym Settings](./19-gym-settings.md)
