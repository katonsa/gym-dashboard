"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { BillingInterval, MemberStatus, PlanTier } from "@/lib/dashboard"
import { createMember } from "./actions"
import {
  createMemberSchema,
  type CreateMemberValues,
} from "./member-create-schema"

const memberStatuses: MemberStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"]
const billingIntervals: BillingInterval[] = ["MONTHLY", "ANNUAL"]

export function MemberCreateForm({
  planTiers,
  initialJoinDate,
}: {
  planTiers: PlanTier[]
  initialJoinDate: string
}) {
  const [isPending, startTransition] = React.useTransition()
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

    startTransition(async () => {
      const actionResult = await createMember(values)

      if (actionResult.success) {
        form.reset(defaultValues)
        toast.success("Member saved.")
        return
      }

      form.setError("root", {
        message:
          actionResult.error ??
          "The member could not be saved. Check the details and try again.",
      })
    })
  }

  return (
    <section
      aria-labelledby="add-member"
      className="rounded-lg border border-border bg-card p-4 text-card-foreground"
    >
      <div className="grid gap-2 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            Owner entry
          </p>
          <h2 id="add-member" className="mt-2 text-base font-semibold">
            Add member
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Create a roster record and start billing when a plan is selected.
          </p>
        </div>
        {activePlanTiers.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            Add an active plan before starting memberships.
          </p>
        ) : null}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 grid gap-4">
        <FieldGroup>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    className="min-h-11"
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
                    className="min-h-11"
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
                    className="min-h-11"
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
                    className="min-h-11"
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
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
                    className="min-h-11"
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
                    className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-70"
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
                  className="min-h-24 w-full min-w-0 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
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
    </section>
  )
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
