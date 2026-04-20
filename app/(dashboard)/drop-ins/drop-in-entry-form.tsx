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
import { createDropInVisit } from "./actions"
import {
  createDropInSchema,
  type CreateDropInValues,
} from "@/lib/dashboard/schemas/drop-in-create-schema"

export function DropInEntryForm({
  defaultAmount,
  formattedDefaultAmount,
}: {
  defaultAmount: number
  formattedDefaultAmount: string
}) {
  const [isPending, startTransition] = React.useTransition()
  const defaultValues = React.useMemo<CreateDropInValues>(
    () => ({
      visitorName: "",
      visitorContact: "",
      amount: String(defaultAmount),
      visitCount: "1",
      notes: "",
    }),
    [defaultAmount]
  )
  const form = useForm<CreateDropInValues>({
    resolver: zodResolver(createDropInSchema),
    defaultValues,
  })
  const isSubmitting = form.formState.isSubmitting || isPending

  function onSubmit(values: CreateDropInValues) {
    form.clearErrors("root")

    startTransition(async () => {
      const actionResult = await createDropInVisit(values)

      if (actionResult.success) {
        form.reset(defaultValues)
        toast.success("Drop-in saved.")
        return
      }

      form.setError("root", {
        message:
          actionResult.error ??
          "The drop-in could not be saved. Check the details and try again.",
      })
    })
  }

  return (
    <aside
      aria-labelledby="drop-in-entry"
      className="rounded-lg border border-border bg-card p-4 text-card-foreground"
    >
      <div>
        <p className="text-xs font-semibold text-primary uppercase">
          Owner entry
        </p>
        <h2 id="drop-in-entry" className="mt-2 text-base font-semibold">
          Add drop-in
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Log anonymous walk-ins or identified visitors for follow-up.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 grid gap-4">
        <FieldGroup>
          <Controller
            name="visitorName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Visitor name</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  autoComplete="name"
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
            name="visitorContact"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Contact</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="Phone, email, or other"
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Controller
              name="amount"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Amount paid</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="10000000"
                    step="1"
                    placeholder={String(defaultAmount)}
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
              name="visitCount"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Visit count</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="100"
                    step="1"
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

          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
                <textarea
                  {...field}
                  id={field.name}
                  rows={4}
                  placeholder="Interest, class time, referral source"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  className="min-h-24 w-full min-w-0 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-70"
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        </FieldGroup>

        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Default amount: {formattedDefaultAmount}
        </p>

        {form.formState.errors.root?.message ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
          >
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <div className="grid gap-3">
          <Button
            type="submit"
            size="lg"
            className="min-h-11"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving drop-in" : "Save drop-in"}
          </Button>
        </div>
      </form>
    </aside>
  )
}
