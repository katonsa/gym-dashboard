"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { updateMemberContact } from "./actions"
import {
  updateMemberContactSchema,
  type UpdateMemberContactActionResult,
  type UpdateMemberContactValues,
} from "./update-member-contact-schema"

type MemberContactCardProps = {
  member: {
    id: string
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    notes?: string | null
  }
  joinDateLabel: string
  lastAttendedLabel: string
}

export function MemberContactCard({
  member,
  joinDateLabel,
  lastAttendedLabel,
}: MemberContactCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = React.useState(false)
  const [result, setResult] = React.useState<UpdateMemberContactActionResult>({
    success: false,
  })
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const defaultValues = React.useMemo<UpdateMemberContactValues>(
    () => ({
      memberId: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email ?? "",
      phone: member.phone ?? "",
      notes: member.notes ?? "",
    }),
    [member]
  )
  const form = useForm<UpdateMemberContactValues>({
    resolver: zodResolver(updateMemberContactSchema, undefined, {
      raw: true,
    }),
    defaultValues,
  })
  const isSubmitting = form.formState.isSubmitting || isPending

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  function startEditing() {
    setIsEditing(true)
    setResult({ success: false })
    setSuccessMessage("")
    form.clearErrors()
    form.reset(defaultValues)
  }

  function cancelEditing() {
    setIsEditing(false)
    setResult({ success: false })
    form.clearErrors()
    form.reset(defaultValues)
  }

  function onSubmit(values: UpdateMemberContactValues) {
    form.clearErrors("root")
    setResult({ success: false })
    setSuccessMessage("")

    startTransition(async () => {
      const actionResult = await updateMemberContact(values)

      setResult(actionResult)

      if (actionResult.success) {
        setIsEditing(false)
        setSuccessMessage("Contact details updated.")
        router.refresh()
        return
      }

      form.setError("root", {
        message:
          actionResult.error ??
          "The contact details could not be saved. Check the details and try again.",
      })
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Contact</h2>
          <p aria-live="polite" className="mt-1 min-h-4 text-xs text-status">
            {result.success ? successMessage : ""}
          </p>
        </div>
        {!isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 w-fit"
            onClick={startEditing}
          >
            <Pencil />
            Edit
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FieldGroup>
            <input type="hidden" {...form.register("memberId")} />

            <div className="grid gap-3 sm:grid-cols-2">
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
                      maxLength={100}
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
                      maxLength={100}
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

            <div className="grid gap-3 sm:grid-cols-2">
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
                      maxLength={255}
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
                      maxLength={50}
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
                    maxLength={1000}
                    placeholder="Optional"
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                    className="min-h-28 w-full min-w-0 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <DetailField label="Join date" value={joinDateLabel} />
              <DetailField label="Last attended" value={lastAttendedLabel} />
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

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-11"
              disabled={isSubmitting}
              onClick={cancelEditing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              className="min-h-11"
              disabled={isSubmitting}
            >
              <Save />
              {isSubmitting ? "Saving changes" : "Save changes"}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Email" value={member.email ?? "Not provided"} />
            <DetailField label="Phone" value={member.phone ?? "Not provided"} />
            <DetailField label="Join date" value={joinDateLabel} />
            <DetailField label="Last attended" value={lastAttendedLabel} />
          </div>
          <div className="mt-4">
            <DetailField label="Notes" value={member.notes ?? "No notes"} />
          </div>
        </div>
      )}
    </section>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium break-words">{value}</p>
    </div>
  )
}
