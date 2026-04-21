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
import {
  gymCurrencyOptions,
  gymTimezoneOptions,
} from "@/lib/dashboard/gym-settings-options"
import type { OwnerGym } from "@/lib/dashboard/owner-gym"
import {
  updateGymSettingsSchema,
  type UpdateGymSettingsValues,
} from "@/lib/dashboard/schemas/gym-settings-schema"
import { updateGymSettings } from "./actions"

export function SettingsForm({ gym }: { gym: OwnerGym }) {
  const [isPending, startTransition] = React.useTransition()
  const defaultValues = React.useMemo<UpdateGymSettingsValues>(
    () => ({
      name: gym.name,
      timezone: gym.timezone,
      currencyCode: gym.currencyCode,
      defaultDropInFeeAmount: String(gym.defaultDropInFeeAmount),
    }),
    [gym.currencyCode, gym.defaultDropInFeeAmount, gym.name, gym.timezone]
  )
  const form = useForm<UpdateGymSettingsValues>({
    resolver: zodResolver(updateGymSettingsSchema),
    defaultValues,
  })
  const isSubmitting = form.formState.isSubmitting || isPending

  function onSubmit(values: UpdateGymSettingsValues) {
    form.clearErrors("root")

    startTransition(async () => {
      const actionResult = await updateGymSettings(values)

      if (actionResult.success) {
        form.reset({
          name: values.name.trim(),
          timezone: values.timezone,
          currencyCode: values.currencyCode.trim().toUpperCase(),
          defaultDropInFeeAmount: values.defaultDropInFeeAmount.trim(),
        })
        toast.success("Settings saved.")
        return
      }

      form.setError("root", {
        message:
          actionResult.error ??
          "The gym settings could not be saved. Try again.",
      })
    })
  }

  return (
    <section
      aria-labelledby="gym-settings-form"
      className="rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5"
    >
      <div>
        <p className="text-xs font-semibold text-primary uppercase">
          Gym profile
        </p>
        <h2 id="gym-settings-form" className="mt-2 text-base font-semibold">
          Operating defaults
        </h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
          These values drive dashboard dates, currency formatting, and new
          drop-in entries.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 grid gap-5">
        <FieldGroup>
          <div className="grid gap-3 md:grid-cols-2">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Gym name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    autoComplete="organization"
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
              name="defaultDropInFeeAmount"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Default drop-in fee
                  </FieldLabel>
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
                    className="min-h-11 border-foreground/10 bg-input/30 shadow-inner shadow-foreground/5"
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Controller
              name="timezone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Timezone</FieldLabel>
                  <select
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                    className="min-h-11 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm font-normal text-foreground shadow-inner shadow-foreground/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-70"
                  >
                    {gymTimezoneOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
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
              name="currencyCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Currency</FieldLabel>
                  <select
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                    className="min-h-11 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm font-normal text-foreground shadow-inner shadow-foreground/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-70"
                  >
                    {gymCurrencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
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
            {isSubmitting ? "Saving settings" : "Save settings"}
          </Button>
        </div>
      </form>
    </section>
  )
}
