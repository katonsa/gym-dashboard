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
import { Textarea } from "@/components/ui/textarea"
import {
  createPlanTierSchema,
  type CreatePlanTierValues,
} from "@/lib/dashboard/schemas/plan-tier-schema"
import { createPlanTier } from "@/app/(dashboard)/settings/actions"

export function SetupPlanTierForm({
  currencyCode,
  nextSortOrder,
}: {
  currencyCode: string
  nextSortOrder: number
}) {
  const [isPending, startTransition] = React.useTransition()
  const defaultValues = React.useMemo<CreatePlanTierValues>(
    () => ({
      name: "",
      description: "",
      monthlyPriceAmount: "",
      annualPriceAmount: "",
      sortOrder: String(nextSortOrder),
      isActive: true,
    }),
    [nextSortOrder]
  )
  const form = useForm<CreatePlanTierValues>({
    resolver: zodResolver(createPlanTierSchema),
    defaultValues,
  })
  const isSubmitting = form.formState.isSubmitting || isPending

  function onSubmit(values: CreatePlanTierValues) {
    form.clearErrors("root")

    startTransition(async () => {
      const actionResult = await createPlanTier({
        ...values,
        sortOrder: String(nextSortOrder),
        isActive: true,
      })

      if (actionResult.success) {
        toast.success("Plan created.")
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
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Plan name</FieldLabel>
              <Input
                {...field}
                id={field.name}
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
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Description</FieldLabel>
              <Textarea
                {...field}
                id={field.name}
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

        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            name="monthlyPriceAmount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Monthly price</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
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
                <FieldLabel htmlFor={field.name}>Annual price</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
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
          {isSubmitting ? "Creating plan" : "Create plan"}
        </Button>
      </div>
    </form>
  )
}
