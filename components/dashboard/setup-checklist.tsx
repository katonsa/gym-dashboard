"use client"

import { Check, Circle } from "lucide-react"

import { MemberCreateForm } from "@/app/(dashboard)/members/member-create-form"
import { DropInEntryForm } from "@/app/(dashboard)/drop-ins/drop-in-entry-form"
import { SetupPlanTierForm } from "@/components/dashboard/setup-plan-tier-form"
import type { DropInVisitorLookupOption } from "@/lib/dashboard/drop-in-visitor-lookup"
import type { OverviewSetupState } from "@/lib/dashboard/aggregate-types"
import type { PlanTier } from "@/lib/dashboard/types"

type SetupChecklistStep = {
  stepNumber: number
  title: string
  description: string
  isComplete: boolean
  isActive: boolean
}

function getSteps(setupState: OverviewSetupState): SetupChecklistStep[] {
  const activeStep = !setupState.hasPlanTiers
    ? 1
    : !setupState.hasMembers
      ? 2
      : !setupState.hasDropIns
        ? 3
        : null

  return [
    {
      stepNumber: 1,
      title: "Create your first plan",
      description:
        "Add a membership plan so you can assign members and track subscriptions.",
      isComplete: setupState.hasPlanTiers,
      isActive: activeStep === 1,
    },
    {
      stepNumber: 2,
      title: "Add your first member",
      description: "Record a member to start tracking attendance and billing.",
      isComplete: setupState.hasMembers,
      isActive: activeStep === 2,
    },
    {
      stepNumber: 3,
      title: "Log your first drop-in",
      description:
        "Record a walk-in visit to start tracking drop-in revenue and leads.",
      isComplete: setupState.hasDropIns,
      isActive: activeStep === 3,
    },
  ]
}

export function SetupChecklist({
  setupState,
  currencyCode,
  defaultDropInFeeAmount,
  formattedDefaultAmount,
  planTiers,
  initialJoinDate,
  visitorLookupOptions,
  nextSortOrder,
}: {
  setupState: OverviewSetupState
  currencyCode: string
  defaultDropInFeeAmount: number
  formattedDefaultAmount: string
  planTiers: PlanTier[]
  initialJoinDate: string
  visitorLookupOptions: DropInVisitorLookupOption[]
  nextSortOrder: number
}) {
  const steps = getSteps(setupState)

  return (
    <section
      aria-labelledby="finish-setup"
      className="rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5"
    >
      <div className="mb-4">
        <p className="text-xs font-semibold text-primary uppercase">
          Getting started
        </p>
        <h2 id="finish-setup" className="mt-2 text-base font-semibold">
          Finish setting up your gym
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Complete these steps to activate your dashboard and start tracking
          revenue.
        </p>
      </div>

      <div className="grid gap-3">
        {steps.map((step) => (
          <SetupStep key={step.stepNumber} {...step}>
            {step.stepNumber === 1 && step.isActive ? (
              <SetupPlanTierForm
                currencyCode={currencyCode}
                nextSortOrder={nextSortOrder}
              />
            ) : null}
            {step.stepNumber === 2 && step.isActive ? (
              <MemberCreateForm
                planTiers={planTiers}
                initialJoinDate={initialJoinDate}
              />
            ) : null}
            {step.stepNumber === 3 && step.isActive ? (
              <DropInEntryForm
                defaultAmount={defaultDropInFeeAmount}
                formattedDefaultAmount={formattedDefaultAmount}
                visitorLookupOptions={visitorLookupOptions}
              />
            ) : null}
          </SetupStep>
        ))}
      </div>
    </section>
  )
}

function SetupStep({
  stepNumber,
  title,
  description,
  isComplete,
  isActive,
  children,
}: SetupChecklistStep & { children?: React.ReactNode }) {
  return (
    <div
      className={`rounded-lg border ${
        isActive
          ? "border-primary/25 bg-background"
          : isComplete
            ? "border-border bg-muted/30"
            : "border-border bg-muted/10"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 shrink-0">
          {isComplete ? (
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          ) : isActive ? (
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary">
              <span className="text-xs font-semibold">{stepNumber}</span>
            </span>
          ) : (
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Circle className="size-2.5 fill-current" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-semibold ${
              isComplete
                ? "text-muted-foreground line-through decoration-muted-foreground/30"
                : isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
            }`}
          >
            {title}
          </h3>
          {isActive ? (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {isActive && children ? (
        <div className="border-t border-border px-4 pt-4 pb-4">{children}</div>
      ) : null}
    </div>
  )
}
