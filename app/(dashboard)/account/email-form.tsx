"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  changeEmailSchema,
  type ChangeEmailValues,
} from "@/lib/auth/schemas/account-settings-schema"
import { changeEmail } from "./actions"

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const form = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      newEmail: "",
      currentPassword: "",
    },
  })
  const isSubmitting = form.formState.isSubmitting || isPending

  function onSubmit(values: ChangeEmailValues) {
    form.clearErrors("root")

    startTransition(async () => {
      const actionResult = await changeEmail(values)

      if (actionResult.success) {
        form.reset({
          newEmail: "",
          currentPassword: "",
        })
        router.refresh()
        toast.success("Email changed.")
        return
      }

      form.setError("root", {
        message:
          actionResult.error ?? "The email could not be changed. Try again.",
      })
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5">
      <div>
        <p className="text-xs font-semibold text-primary uppercase">
          Account email
        </p>
        <h2 className="mt-2 text-base font-semibold">Change email</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Your current sign-in email is{" "}
          <span className="font-medium text-foreground">{currentEmail}</span>.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 grid gap-5">
        <input
          type="email"
          autoComplete="username"
          value={currentEmail}
          readOnly
          tabIndex={-1}
          className="sr-only"
          aria-hidden="true"
        />
        <FieldGroup>
          <Controller
            name="newEmail"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>New email</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="email"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  className="min-h-11 border-foreground/10 bg-input/30 shadow-inner shadow-foreground/5"
                />
                <FieldDescription>
                  Changes apply immediately after password confirmation.
                </FieldDescription>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

          <Controller
            name="currentPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Current password</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  className="min-h-11 border-foreground/10 bg-input/30 shadow-inner shadow-foreground/5"
                />
                <FieldDescription>
                  All other sessions are revoked after a successful email
                  change.
                </FieldDescription>
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

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            className="min-h-11"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Changing email" : "Change email"}
          </Button>
        </div>
      </form>
    </section>
  )
}
