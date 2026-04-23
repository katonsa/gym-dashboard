"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  ChevronsUpDown,
  CircleDollarSign,
  Save,
  UserSearch,
} from "lucide-react"
import * as React from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import type { DropInVisitorLookupOption } from "@/lib/drop-ins/visitor-lookup"
import { createDropInVisit } from "./actions"
import {
  createDropInSchema,
  type CreateDropInValues,
} from "@/lib/drop-ins/schemas/create-drop-in-schema"

export function DropInEntryForm({
  defaultAmount,
  formattedDefaultAmount,
  visitorLookupOptions,
}: {
  defaultAmount: number
  formattedDefaultAmount: string
  visitorLookupOptions: DropInVisitorLookupOption[]
}) {
  const [isLookupOpen, setIsLookupOpen] = React.useState(false)
  const [selectedVisitorId, setSelectedVisitorId] = React.useState<
    string | undefined
  >()
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
  const visitorName = useWatch({
    control: form.control,
    name: "visitorName",
  })
  const visitorContact = useWatch({
    control: form.control,
    name: "visitorContact",
  })
  const selectedVisitor = visitorLookupOptions.find(
    (visitor) => visitor.id === selectedVisitorId
  )

  React.useEffect(() => {
    if (!selectedVisitor) {
      return
    }

    const matchesSelectedVisitor =
      visitorName === (selectedVisitor.visitorName ?? "") &&
      visitorContact === (selectedVisitor.visitorContact ?? "")

    if (!matchesSelectedVisitor) {
      setSelectedVisitorId(undefined)
    }
  }, [selectedVisitor, visitorContact, visitorName])

  function selectVisitor(visitor: DropInVisitorLookupOption) {
    setSelectedVisitorId(visitor.id)
    form.setValue("visitorName", visitor.visitorName ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    })
    form.setValue("visitorContact", visitor.visitorContact ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    })
    setIsLookupOpen(false)
  }

  function onSubmit(values: CreateDropInValues) {
    form.clearErrors("root")

    startTransition(async () => {
      const actionResult = await createDropInVisit(values)

      if (actionResult.success) {
        form.reset(defaultValues)
        setSelectedVisitorId(undefined)
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
      className="order-first rounded-lg border border-border bg-card p-4 text-card-foreground xl:sticky xl:top-24 xl:order-last"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CircleDollarSign className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            Owner entry
          </p>
          <h2 id="drop-in-entry" className="mt-1 text-base font-semibold">
            Add drop-in
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Built for quick front-desk logging on phone or tablet.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 grid gap-4">
        <FieldGroup>
          <Field>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="visitor-lookup">Visitor lookup</FieldLabel>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <UserSearch className="size-3.5" />
                Optional
              </span>
            </div>
            <Popover open={isLookupOpen} onOpenChange={setIsLookupOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="visitor-lookup"
                  type="button"
                  variant="outline"
                  size="lg"
                  role="combobox"
                  aria-expanded={isLookupOpen}
                  disabled={isSubmitting || visitorLookupOptions.length === 0}
                  className="min-h-11 w-full justify-between"
                >
                  <span className="min-w-0 truncate text-left">
                    {selectedVisitor?.label ??
                      (visitorLookupOptions.length > 0
                        ? "Select returning visitor"
                        : "No returning visitors")}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] p-0"
              >
                <Command>
                  <CommandInput placeholder="Search visitors..." />
                  <CommandList>
                    <CommandEmpty>No visitor found.</CommandEmpty>
                    <CommandGroup>
                      {visitorLookupOptions.map((visitor) => (
                        <CommandItem
                          key={visitor.id}
                          value={`${visitor.visitorName ?? ""} ${
                            visitor.visitorContact ?? ""
                          }`}
                          data-checked={selectedVisitorId === visitor.id}
                          onSelect={() => selectVisitor(visitor)}
                        >
                          <span className="grid min-w-0 gap-0.5">
                            <span className="truncate">
                              {visitor.visitorName ??
                                visitor.visitorContact ??
                                "Identified visitor"}
                            </span>
                            {visitor.visitorContact && visitor.visitorName ? (
                              <span className="truncate text-xs text-muted-foreground">
                                {visitor.visitorContact}
                              </span>
                            ) : null}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </Field>

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
                  placeholder="Walk-in name"
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
                  placeholder="Phone or email"
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
                <Textarea
                  {...field}
                  id={field.name}
                  rows={4}
                  placeholder="Interest, class time, referral source"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  className="min-h-24 resize-none bg-background text-sm"
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        </FieldGroup>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs">
          <span className="text-muted-foreground">Default amount</span>
          <span className="font-semibold text-foreground">
            {formattedDefaultAmount}
          </span>
        </div>

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
            <Save />
            {isSubmitting ? "Saving drop-in" : "Save drop-in"}
          </Button>
        </div>
      </form>
    </aside>
  )
}
