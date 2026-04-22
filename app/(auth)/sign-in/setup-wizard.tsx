"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/client"
import {
  gymCurrencyOptions,
  gymTimezoneOptions,
} from "@/lib/gyms/settings-options"
import { createGym } from "@/lib/gyms/create-gym-action"
import { setupSchema, type SetupValues } from "@/lib/auth/schemas/setup-schema"

const selectClassName =
  "min-h-11 rounded-lg border border-foreground/10 bg-input/30 px-3 text-sm font-normal text-foreground shadow-inner shadow-foreground/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-70"

export function SetupWizard() {
  const router = useRouter()
  const form = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      gymName: "",
      timezone: "Asia/Jakarta",
      currencyCode: "IDR",
      defaultDropInFeeAmount: "50000",
    },
  })

  const isSubmitting = form.formState.isSubmitting

  async function onSubmit(values: SetupValues) {
    form.clearErrors("root")

    try {
      const signUpResult = await authClient.signUp.email(
        {
          name: values.name,
          email: values.email,
          password: values.password,
        },
        {
          onError: ({ error }) => {
            const message = error?.message ?? ""
            if (
              message.includes("already") ||
              message.includes("exist") ||
              message.includes("422")
            ) {
              form.setError("root", {
                message: "An account with this email already exists.",
              })
            } else {
              form.setError("root", {
                message: "We could not create your account. Try again.",
              })
            }
          },
        }
      )

      if (signUpResult.error) {
        return
      }

      const gymResult = await createGym({
        gymName: values.gymName,
        timezone: values.timezone,
        currencyCode: values.currencyCode,
        defaultDropInFeeAmount: values.defaultDropInFeeAmount,
      })

      if (!gymResult.success) {
        form.setError("root", {
          message:
            gymResult.error ??
            "Your account was created, but the gym could not be set up. Contact support.",
        })
        return
      }

      router.replace("/")
      router.refresh()
    } catch {
      form.setError("root", {
        message: "Setup is unavailable right now. Try again shortly.",
      })
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <p className="text-xs font-semibold text-primary uppercase">Account</p>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Your name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                className="min-h-11"
                autoComplete="name"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
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
                className="min-h-11"
                inputMode="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Password</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                className="min-h-11"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>

      <FieldGroup>
        <p className="text-xs font-semibold text-primary uppercase">Gym</p>
        <Controller
          name="gymName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Gym name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                className="min-h-11"
                autoComplete="organization"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
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
              <FieldLabel htmlFor={field.name}>Default drop-in fee</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                inputMode="numeric"
                min="0"
                max="10000000"
                step="1"
                className="min-h-11"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
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

      <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Setting up" : "Create account & gym"}
      </Button>
    </form>
  )
}
