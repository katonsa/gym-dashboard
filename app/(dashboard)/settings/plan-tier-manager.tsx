"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus, Power } from "lucide-react"
import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/dashboard/formatters"
import type { PlanTierManagementRow } from "@/lib/plans/plan-tier-service"
import {
  createPlanTierSchema,
  updatePlanTierSchema,
  type CreatePlanTierValues,
  type UpdatePlanTierValues,
} from "@/lib/plans/schemas/plan-tier-schema"
import { createPlanTier, deactivatePlanTier, updatePlanTier } from "./actions"

type PlanTierFormValues = CreatePlanTierValues | UpdatePlanTierValues

export function PlanTierManager({
  currencyCode,
  nextSortOrder,
  planTiers,
}: {
  currencyCode: string
  nextSortOrder: number
  planTiers: PlanTierManagementRow[]
}) {
  const [editingPlanTier, setEditingPlanTier] =
    React.useState<PlanTierManagementRow | null>(null)

  return (
    <section
      aria-labelledby="plan-tier-manager"
      className="grid gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5"
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            Plan tiers
          </p>
          <h2 id="plan-tier-manager" className="mt-2 text-base font-semibold">
            Membership pricing
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Active plans are available when adding members or changing
            memberships. Inactive plans remain visible in reports and history.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Active tiers
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {planTiers.filter((planTier) => planTier.isActive).length}
          </p>
        </div>
      </div>

      <PlanTierForm
        currencyCode={currencyCode}
        defaultValues={{
          name: "",
          description: "",
          monthlyPriceAmount: "",
          annualPriceAmount: "",
          sortOrder: String(nextSortOrder),
          isActive: true,
        }}
        mode="create"
      />

      <div className="grid gap-3">
        {planTiers.length > 0 ? (
          planTiers.map((planTier) => (
            <article
              key={planTier.id}
              className="grid gap-4 rounded-lg border border-border bg-background p-4 md:grid-cols-[1fr_auto] md:items-start"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{planTier.name}</h3>
                  <PlanTierStatusBadge isActive={planTier.isActive} />
                </div>
                {planTier.description ? (
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {planTier.description}
                  </p>
                ) : null}
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  <PlanTierMetric
                    label="Monthly"
                    value={formatCurrency(
                      planTier.monthlyPriceAmount,
                      currencyCode
                    )}
                  />
                  <PlanTierMetric
                    label="Annual"
                    value={formatCurrency(
                      planTier.annualPriceAmount,
                      currencyCode
                    )}
                  />
                  <PlanTierMetric
                    label="Sort order"
                    value={String(planTier.sortOrder)}
                  />
                  <PlanTierMetric
                    label="Current members"
                    value={String(planTier.activeMembershipsCount)}
                  />
                </dl>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPlanTier(planTier)}
                >
                  <Pencil data-icon="inline-start" />
                  Edit
                </Button>
                {planTier.isActive ? (
                  <DeactivatePlanTierButton planTier={planTier} />
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center">
            <p className="text-sm font-medium">No plan tiers yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a plan before assigning memberships.
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={editingPlanTier !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPlanTier(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit plan</DialogTitle>
            <DialogDescription>
              Changes apply to future assignments. Existing memberships keep the
              price captured when they were created.
            </DialogDescription>
          </DialogHeader>
          {editingPlanTier ? (
            <PlanTierForm
              key={editingPlanTier.id}
              currencyCode={currencyCode}
              defaultValues={{
                planTierId: editingPlanTier.id,
                name: editingPlanTier.name,
                description: editingPlanTier.description ?? "",
                monthlyPriceAmount: String(editingPlanTier.monthlyPriceAmount),
                annualPriceAmount: String(editingPlanTier.annualPriceAmount),
                sortOrder: String(editingPlanTier.sortOrder),
                isActive: editingPlanTier.isActive,
              }}
              mode="update"
              onSaved={() => setEditingPlanTier(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function PlanTierForm({
  currencyCode,
  defaultValues,
  mode,
  onSaved,
}: {
  currencyCode: string
  defaultValues: PlanTierFormValues
  mode: "create" | "update"
  onSaved?: () => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const form = useForm<PlanTierFormValues>({
    resolver: zodResolver(
      mode === "create" ? createPlanTierSchema : updatePlanTierSchema
    ),
    defaultValues,
  })
  const isSubmitting = isPending

  function onSubmit(values: PlanTierFormValues) {
    form.clearErrors("root")

    startTransition(async () => {
      const actionResult =
        mode === "create"
          ? await createPlanTier(values as CreatePlanTierValues)
          : await updatePlanTier(values as UpdatePlanTierValues)

      if (actionResult.success) {
        if (mode === "create") {
          form.reset(defaultValues)
          toast.success("Plan created.")
        } else {
          toast.success("Plan saved.")
          onSaved?.()
        }
        return
      }

      form.setError("root", {
        message:
          actionResult.error ??
          "The plan could not be saved. Check the details and try again.",
      })
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <FieldGroup>
        {"planTierId" in defaultValues ? (
          <input type="hidden" {...form.register("planTierId")} />
        ) : null}

        <div className="grid gap-3 md:grid-cols-[1fr_10rem]">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${mode}-${field.name}`}>
                  Plan name
                </FieldLabel>
                <Input
                  {...field}
                  id={`${mode}-${field.name}`}
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  disabled={isSubmitting}
                  placeholder="Basic, Pro, Elite"
                  className="min-h-11 border-foreground/10 bg-input/30 shadow-inner shadow-foreground/5"
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

          <Controller
            name="sortOrder"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${mode}-${field.name}`}>
                  Sort order
                </FieldLabel>
                <Input
                  {...field}
                  id={`${mode}-${field.name}`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="10000"
                  step="1"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  className="min-h-11 border-foreground/10 bg-input/30 shadow-inner shadow-foreground/5"
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        </div>

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${mode}-${field.name}`}>
                Description
              </FieldLabel>
              <Textarea
                {...field}
                id={`${mode}-${field.name}`}
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
                placeholder="Optional"
                className="border-foreground/10 bg-input/30 shadow-inner shadow-foreground/5"
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <Controller
            name="monthlyPriceAmount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${mode}-${field.name}`}>
                  Monthly price
                </FieldLabel>
                <Input
                  {...field}
                  id={`${mode}-${field.name}`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="10000000"
                  step="1"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  placeholder={currencyCode}
                  className="min-h-11 border-foreground/10 bg-input/30 shadow-inner shadow-foreground/5"
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

          <Controller
            name="annualPriceAmount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${mode}-${field.name}`}>
                  Annual price
                </FieldLabel>
                <Input
                  {...field}
                  id={`${mode}-${field.name}`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="10000000"
                  step="1"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  placeholder={currencyCode}
                  className="min-h-11 border-foreground/10 bg-input/30 shadow-inner shadow-foreground/5"
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        </div>

        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background px-3 text-sm">
              <input
                type="checkbox"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                disabled={isSubmitting}
                className="size-4 rounded border-border accent-primary"
              />
              <span>Active for new memberships</span>
            </label>
          )}
        />
      </FieldGroup>

      {form.formState.errors.root?.message ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
        >
          {form.formState.errors.root.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="submit"
          size="lg"
          className="min-h-11"
          disabled={isSubmitting}
        >
          {mode === "create" ? (
            <Plus data-icon="inline-start" />
          ) : (
            <Pencil data-icon="inline-start" />
          )}
          {isSubmitting
            ? mode === "create"
              ? "Creating plan"
              : "Saving plan"
            : mode === "create"
              ? "Create plan"
              : "Save plan"}
        </Button>
      </div>
    </form>
  )
}

function DeactivatePlanTierButton({
  planTier,
}: {
  planTier: PlanTierManagementRow
}) {
  const [isPending, startTransition] = React.useTransition()

  function handleDeactivate() {
    startTransition(async () => {
      const actionResult = await deactivatePlanTier({ planTierId: planTier.id })

      if (actionResult.success) {
        toast.success(`${planTier.name} deactivated.`)
        return
      }

      toast.error(actionResult.error ?? "The plan could not be deactivated.")
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          <Power data-icon="inline-start" />
          Deactivate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {planTier.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This hides the plan from new memberships and plan changes.
            {planTier.activeMembershipsCount > 0
              ? ` ${planTier.activeMembershipsCount} current memberships will stay on this plan.`
              : " No current memberships are assigned to this plan."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={handleDeactivate}
            variant="destructive"
          >
            {isPending ? "Deactivating" : "Deactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function PlanTierStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={
        isActive
          ? "inline-flex w-fit items-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[0.7rem] font-medium text-emerald-700 uppercase dark:text-emerald-300"
          : "inline-flex w-fit items-center rounded-lg border border-muted-foreground/25 bg-muted px-2 py-1 text-[0.7rem] font-medium text-muted-foreground uppercase"
      }
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  )
}

function PlanTierMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  )
}
