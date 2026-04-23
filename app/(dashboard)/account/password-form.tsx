"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import * as React from "react"
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
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/lib/auth/schemas/account-settings-schema"
import { changePassword } from "./actions"

export function PasswordForm({ currentEmail }: { currentEmail: string }) {
  const [isPending, startTransition] = React.useTransition()
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })
  const isSubmitting = form.formState.isSubmitting || isPending

  function onSubmit(values: ChangePasswordValues) {
    form.clearErrors("root")

    startTransition(async () => {
      const actionResult = await changePassword(values)

      if (actionResult.success) {
        form.reset({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        toast.success("Password changed.")
        return
      }

      form.setError("root", {
        message:
          actionResult.error ?? "The password could not be changed. Try again.",
      })
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5">
      <div>
        <p className="text-xs font-semibold text-primary uppercase">Password</p>
        <h2 className="mt-2 text-base font-semibold">Change password</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Use your current password to confirm the change. Other sessions are
          revoked after a successful update.
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
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Controller
              name="newPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                    className="min-h-11 border-foreground/10 bg-input/30 shadow-inner shadow-foreground/5"
                  />
                  <FieldDescription>
                    Passwords must be 8 to 128 characters.
                  </FieldDescription>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="new-password"
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
            {isSubmitting ? "Changing password" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  )
}
