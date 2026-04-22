"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { Dumbbell } from "lucide-react"
import { toast } from "sonner"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  gymCurrencyOptions,
  gymTimezoneOptions,
} from "@/lib/gyms/settings-options"
import { createGym } from "@/lib/gyms/create-gym-action"
import {
  createGymSchema,
  type CreateGymValues,
} from "@/lib/gyms/schemas/create-gym-schema"

const selectClassName =
  "min-h-11 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm font-normal text-foreground shadow-inner shadow-foreground/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-70"

export function GymSetupShell() {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const form = useForm<CreateGymValues>({
    resolver: zodResolver(createGymSchema),
    defaultValues: {
      gymName: "",
      timezone: "Asia/Jakarta",
      currencyCode: "IDR",
      defaultDropInFeeAmount: "50000",
    },
  })

  const isSubmitting = form.formState.isSubmitting || isPending

  function onSubmit(values: CreateGymValues) {
    form.clearErrors("root")

    startTransition(async () => {
      const result = await createGym(values)

      if (result.success) {
        toast.success("Gym created.")
        router.refresh()
        return
      }

      form.setError("root", {
        message: result.error ?? "The gym could not be created. Try again.",
      })
    })
  }

  return (
    <main className="min-h-svh bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-3xl flex-col">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                Gym dashboard
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Setup required
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <SignOutButton compact />
          </div>
        </header>

        <section className="flex flex-1 items-center py-12">
          <div className="w-full rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6">
            <p className="text-xs font-semibold text-primary uppercase">
              Gym setup
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
              Set up your gym.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Enter your gym details to start using the dashboard.
            </p>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-5 grid gap-5"
            >
              <FieldGroup>
                <Controller
                  name="gymName"
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
                          className={selectClassName}
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
                          className={selectClassName}
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
                  {isSubmitting ? "Creating gym" : "Create gym"}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
