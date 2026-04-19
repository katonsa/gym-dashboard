"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import * as React from "react"
import { Controller, useForm, useWatch } from "react-hook-form"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { BillingInterval, PlanTier } from "@/lib/dashboard"
import { changeMemberPlan } from "./actions"
import {
  changePlanSchema,
  type ChangeMemberPlanValues,
  type ChangePlanActionResult,
} from "./change-plan-schema"

type CurrentPlan = {
  planName: string
  billingInterval: BillingInterval
  priceAmount: number
} | null

const billingIntervals: BillingInterval[] = ["MONTHLY", "ANNUAL"]

export function MemberPlanChangeForm({
  memberId,
  planTiers,
  currentPlan,
  currencyCode,
  initialEffectiveDate,
}: {
  memberId: string
  planTiers: PlanTier[]
  currentPlan: CurrentPlan
  currencyCode: string
  initialEffectiveDate: string
}) {
  const activePlanTiers = React.useMemo(
    () => planTiers.filter((planTier) => planTier.isActive),
    [planTiers]
  )
  const defaultPlanTierId =
    activePlanTiers.find((planTier) => planTier.name === currentPlan?.planName)
      ?.id ??
    activePlanTiers[0]?.id ??
    ""
  const defaultValues = React.useMemo<ChangeMemberPlanValues>(
    () => ({
      memberId,
      planTierId: defaultPlanTierId,
      billingInterval: currentPlan?.billingInterval ?? "MONTHLY",
      effectiveDate: initialEffectiveDate,
    }),
    [
      currentPlan?.billingInterval,
      defaultPlanTierId,
      initialEffectiveDate,
      memberId,
    ]
  )
  const [result, setResult] = React.useState<ChangePlanActionResult>({
    success: false,
  })
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [pendingValues, setPendingValues] =
    React.useState<ChangeMemberPlanValues | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const form = useForm<ChangeMemberPlanValues>({
    resolver: zodResolver(changePlanSchema),
    defaultValues,
  })
  const watchedPlanTierId = useWatch({
    control: form.control,
    name: "planTierId",
  })
  const watchedBillingInterval = useWatch({
    control: form.control,
    name: "billingInterval",
  })
  const selectedPlanTier = React.useMemo(
    () => activePlanTiers.find((planTier) => planTier.id === watchedPlanTierId),
    [activePlanTiers, watchedPlanTierId]
  )
  const selectedPrice = selectedPlanTier
    ? getPlanPrice(selectedPlanTier, watchedBillingInterval as BillingInterval)
    : null
  const isSubmitting = form.formState.isSubmitting || isPending

  function onSubmit(values: ChangeMemberPlanValues) {
    setPendingValues(values)
    setIsConfirmOpen(true)
  }

  function handleConfirmPlanChange() {
    if (!pendingValues) {
      return
    }

    form.clearErrors("root")
    setResult({ success: false })
    setSuccessMessage("")

    const selectedPlan = activePlanTiers.find(
      (planTier) => planTier.id === pendingValues.planTierId
    )

    startTransition(async () => {
      const actionResult = await changeMemberPlan(pendingValues)

      setResult(actionResult)

      if (actionResult.success) {
        setIsConfirmOpen(false)
        setPendingValues(null)
        setSuccessMessage(
          selectedPlan
            ? `Plan changed to ${selectedPlan.name} (${titleCase(
                pendingValues.billingInterval
              )}).`
            : "Plan changed."
        )
        return
      }

      form.setError("root", {
        message:
          actionResult.error ??
          "The plan could not be changed. Check the details and try again.",
      })
    })
  }

  const pendingPlanTier = pendingValues
    ? activePlanTiers.find((planTier) => planTier.id === pendingValues.planTierId)
    : null

  return (
    <section
      id="plan-change"
      aria-labelledby="plan-change-title"
      className="scroll-mt-6 rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5"
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            Billing
          </p>
          <h2 id="plan-change-title" className="mt-2 text-base font-semibold">
            Change plan
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {currentPlan
              ? `Current plan: ${currentPlan.planName} (${titleCase(
                  currentPlan.billingInterval
                )}) at ${formatCurrency(
                  currentPlan.priceAmount,
                  currencyCode
                )}.`
              : "No active membership is assigned."}
          </p>
        </div>
        {activePlanTiers.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            Add an active plan before changing memberships.
          </p>
        ) : null}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 grid gap-4">
        <FieldGroup>
          <input type="hidden" {...form.register("memberId")} />

          <div className="grid gap-3 md:grid-cols-3">
            <Controller
              name="planTierId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Plan</FieldLabel>
                  <select
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting || activePlanTiers.length === 0}
                    className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-70"
                  >
                    <option value="">Choose a plan</option>
                    {activePlanTiers.map((planTier) => (
                      <option key={planTier.id} value={planTier.id}>
                        {planTier.name}
                      </option>
                    ))}
                  </select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="billingInterval"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Billing</FieldLabel>
                  <select
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                    className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    {billingIntervals.map((billingInterval) => (
                      <option key={billingInterval} value={billingInterval}>
                        {titleCase(billingInterval)}
                      </option>
                    ))}
                  </select>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="effectiveDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Effective date</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="date"
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                    className="min-h-11"
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
          </div>
        </FieldGroup>

        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            New price
          </p>
          <p className="mt-1 text-sm font-semibold">
            {selectedPrice === null
              ? "Choose a plan."
              : formatCurrency(selectedPrice, currencyCode)}
          </p>
        </div>

        {form.formState.errors.root?.message ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
          >
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            aria-live="polite"
            className="min-h-5 text-xs text-muted-foreground"
          >
            {result.success ? successMessage : ""}
          </p>
          <Button
            type="submit"
            size="lg"
            className="min-h-11"
            disabled={isSubmitting || activePlanTiers.length === 0}
          >
            {isSubmitting ? "Changing plan..." : "Change plan"}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open)

          if (!open && !isPending) {
            setPendingValues(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm plan change?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPlanTier
                ? `This will end the current membership and move the member to ${pendingPlanTier.name} (${titleCase(
                    pendingValues?.billingInterval ?? "MONTHLY"
                  )}) starting ${formatDate(
                    pendingValues?.effectiveDate ?? initialEffectiveDate
                  )}.`
                : "This will end the current membership and create a new one with the selected billing details."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={handleConfirmPlanChange}
            >
              {isPending ? "Changing plan..." : "Change plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function getPlanPrice(planTier: PlanTier, billingInterval: BillingInterval) {
  return billingInterval === "ANNUAL"
    ? planTier.annualPriceAmount
    : planTier.monthlyPriceAmount
}

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount)
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date)
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
