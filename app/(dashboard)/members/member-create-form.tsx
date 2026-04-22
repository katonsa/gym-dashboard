"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  titleCase,
  type BillingInterval,
  type MemberStatus,
  type PlanTier,
} from "@/lib/dashboard"
import type {
  MemberDuplicateMatch,
  MemberDuplicateReason,
} from "@/lib/dashboard/member-duplicate-detection"
import { createMember } from "./member-actions"
import {
  createMemberSchema,
  type CreateMemberValues,
} from "@/lib/dashboard/schemas/member-create-schema"

const memberStatuses: MemberStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"]
const billingIntervals: BillingInterval[] = ["MONTHLY", "ANNUAL"]

export function MemberCreateForm({
  planTiers,
  initialJoinDate,
  onSaved,
}: {
  planTiers: PlanTier[]
  initialJoinDate: string
  onSaved?: () => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const [duplicateMatches, setDuplicateMatches] = React.useState<
    MemberDuplicateMatch[]
  >([])
  const [pendingDuplicateValues, setPendingDuplicateValues] =
    React.useState<CreateMemberValues | null>(null)
  const defaultValues = React.useMemo<CreateMemberValues>(
    () => ({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      status: "ACTIVE",
      joinDate: initialJoinDate,
      planTierId: "",
      billingInterval: "MONTHLY",
      notes: "",
      confirmDuplicate: false,
    }),
    [initialJoinDate]
  )
  const form = useForm<CreateMemberValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues,
  })
  const activePlanTiers = React.useMemo(
    () => planTiers.filter((planTier) => planTier.isActive),
    [planTiers]
  )
  const isSubmitting = form.formState.isSubmitting || isPending

  function onSubmit(values: CreateMemberValues) {
    form.clearErrors("root")
    setDuplicateMatches([])
    setPendingDuplicateValues(null)

    startTransition(async () => {
      const actionResult = await createMember(values)

      if (actionResult.success) {
        form.reset(defaultValues)
        toast.success("Member saved.")
        onSaved?.()
        return
      }

      if ("duplicateMatches" in actionResult) {
        setPendingDuplicateValues(values)
        setDuplicateMatches(actionResult.duplicateMatches)
        return
      }

      form.setError("root", {
        message:
          ("error" in actionResult ? actionResult.error : undefined) ??
          "The member could not be saved. Check the details and try again.",
      })
    })
  }

  function handleCreateDuplicate(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    if (!pendingDuplicateValues) {
      return
    }

    form.clearErrors("root")

    startTransition(async () => {
      const actionResult = await createMember({
        ...pendingDuplicateValues,
        confirmDuplicate: true,
      })

      if (actionResult.success) {
        setDuplicateMatches([])
        setPendingDuplicateValues(null)
        form.reset(defaultValues)
        toast.success("Member saved.")
        onSaved?.()
        return
      }

      if ("duplicateMatches" in actionResult) {
        setDuplicateMatches(actionResult.duplicateMatches)
        return
      }

      form.setError("root", {
        message:
          ("error" in actionResult ? actionResult.error : undefined) ??
          "The member could not be saved. Check the details and try again.",
      })
    })
  }

  function handleEditDetails() {
    setDuplicateMatches([])
    setPendingDuplicateValues(null)
  }

  return (
    <div className="grid gap-4 text-card-foreground">
      {activePlanTiers.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          Add an active plan before starting memberships.
        </p>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FieldGroup>
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              name="firstName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>First name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    autoComplete="given-name"
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

            <Controller
              name="lastName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Last name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    autoComplete="family-name"
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

            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Optional"
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

            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="tel"
                    autoComplete="tel"
                    placeholder="Optional"
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              name="status"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                  <select
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                    className="min-h-11 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm font-normal text-foreground shadow-inner shadow-foreground/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    {memberStatuses.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
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
              name="joinDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Join date</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="date"
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
                    className="min-h-11 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm font-normal text-foreground shadow-inner shadow-foreground/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-70"
                  >
                    <option value="">No plan yet</option>
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
                    className="min-h-11 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm font-normal text-foreground shadow-inner shadow-foreground/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
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
          </div>

          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
                <textarea
                  {...field}
                  id={field.name}
                  rows={3}
                  placeholder="Optional"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  className="min-h-24 w-full min-w-0 resize-none rounded-lg border border-foreground/10 bg-input/30 px-3 py-2 text-sm shadow-inner shadow-foreground/5 outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
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
            {isSubmitting ? "Saving member" : "Save member"}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={duplicateMatches.length > 0}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            handleEditDetails()
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Possible duplicate member</AlertDialogTitle>
            <AlertDialogDescription>
              Review matching records before creating another member.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
            {duplicateMatches.map((match) => (
              <DuplicateMatchItem key={match.id} match={match} />
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSubmitting}
              onClick={handleEditDetails}
            >
              Edit details
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={handleCreateDuplicate}
            >
              {isSubmitting ? "Creating..." : "Create anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DuplicateMatchItem({ match }: { match: MemberDuplicateMatch }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {match.firstName} {match.lastName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {titleCase(match.status)}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {match.reasons.map((reason) => (
            <span
              key={reason}
              className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[0.7rem] font-medium text-primary"
            >
              {formatDuplicateReason(reason)}
            </span>
          ))}
        </div>
      </div>

      {match.email || match.phone ? (
        <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
          {match.email ? <p className="truncate">{match.email}</p> : null}
          {match.phone ? <p className="truncate">{match.phone}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function formatDuplicateReason(reason: MemberDuplicateReason) {
  switch (reason) {
    case "email":
      return "Email"
    case "phone":
      return "Phone"
    case "similar-name":
      return "Similar name"
  }
}
