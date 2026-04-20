"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2 } from "lucide-react"
import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { logMemberCheckIn } from "./actions"
import { logCheckInSchema, type LogCheckInValues } from "./log-checkin-schema"

export function MemberCheckInForm({
  memberId,
  initialDate,
}: {
  memberId: string
  initialDate: string
}) {
  const defaultValues = React.useMemo<LogCheckInValues>(
    () => ({
      memberId,
      attendedAt: initialDate,
      notes: "",
    }),
    [initialDate, memberId]
  )
  const [isOpen, setIsOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const form = useForm<LogCheckInValues>({
    resolver: zodResolver(logCheckInSchema),
    defaultValues,
  })
  const isSubmitting = form.formState.isSubmitting || isPending

  function handleOpenChange(open: boolean) {
    setIsOpen(open)

    if (open) {
      form.clearErrors()
    }
  }

  function onSubmit(values: LogCheckInValues) {
    form.clearErrors("root")

    startTransition(async () => {
      const actionResult = await logMemberCheckIn(values)

      if (actionResult.success) {
        form.reset(defaultValues)
        setIsOpen(false)
        toast.success(`Check-in logged for ${formatDate(values.attendedAt)}.`)
        return
      }

      form.setError("root", {
        message:
          actionResult.error ??
          "The check-in could not be logged. Check the details and try again.",
      })
    })
  }

  return (
    <div className="grid justify-items-start gap-1 sm:justify-items-end">
      <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger asChild>
          <Button type="button" size="sm" className="min-h-11">
            <CheckCircle2 />
            Log check-in
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log check-in</AlertDialogTitle>
          </AlertDialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FieldGroup>
              <input type="hidden" {...form.register("memberId")} />

              <Controller
                name="attendedAt"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Date</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="date"
                      max={initialDate}
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
                name="notes"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      maxLength={500}
                      aria-invalid={fieldState.invalid}
                      disabled={isSubmitting}
                      placeholder="Optional"
                      className="min-h-11"
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

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>
                Cancel
              </AlertDialogCancel>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Logging..." : "Log check-in"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date)
}
