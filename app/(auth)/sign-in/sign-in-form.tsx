"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/client"

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
})

type SignInValues = z.infer<typeof signInSchema>

export function SignInForm({ nextPath }: { nextPath: string }) {
  const router = useRouter()
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const isSubmitting = form.formState.isSubmitting

  async function onSubmit(values: SignInValues) {
    form.clearErrors("root")

    try {
      await authClient.signIn.email(
        {
          email: values.email,
          password: values.password,
        },
        {
          onSuccess: () => {
            router.replace(nextPath)
            router.refresh()
          },
          onError: () => {
            form.setError("root", {
              message: "We could not sign you in with those credentials.",
            })
          },
        }
      )
    } catch {
      form.setError("root", {
        message: "Sign-in is unavailable right now. Try again shortly.",
      })
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
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
                placeholder="owner@example.com"
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
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
              />
              <FieldDescription>
                Use the owner account provisioned for this gym.
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

      <Button
        type="submit"
        className="min-h-11 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in" : "Sign in"}
      </Button>
    </form>
  )
}
