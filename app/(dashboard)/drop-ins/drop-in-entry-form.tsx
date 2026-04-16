"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"

export function DropInEntryForm({
  defaultAmount,
  formattedDefaultAmount,
}: {
  defaultAmount: number
  formattedDefaultAmount: string
}) {
  const [message, setMessage] = React.useState("")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("Drop-in entry is staged for persistence.")
    event.currentTarget.reset()
  }

  return (
    <aside
      aria-labelledby="drop-in-entry"
      className="rounded-lg border border-border bg-card p-4 text-card-foreground"
    >
      <div>
        <p className="text-xs font-semibold text-primary uppercase">
          Mock entry
        </p>
        <h2 id="drop-in-entry" className="mt-2 text-base font-semibold">
          Add drop-in
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          New submissions stay local until the persistence flow is scoped.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
        <FormField label="Visitor name" htmlFor="drop-in-visitor-name">
          <input
            id="drop-in-visitor-name"
            name="visitorName"
            placeholder="Optional for anonymous walk-ins"
            className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </FormField>

        <FormField label="Contact" htmlFor="drop-in-contact">
          <input
            id="drop-in-contact"
            name="visitorContact"
            placeholder="Phone or email"
            className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <FormField label="Amount paid" htmlFor="drop-in-amount">
            <input
              id="drop-in-amount"
              name="amount"
              type="number"
              min="0"
              step="1000"
              defaultValue={defaultAmount}
              className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </FormField>

          <FormField label="Visit count" htmlFor="drop-in-visit-count">
            <input
              id="drop-in-visit-count"
              name="visitCount"
              type="number"
              min="1"
              defaultValue="1"
              className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </FormField>
        </div>

        <FormField label="Notes" htmlFor="drop-in-notes">
          <textarea
            id="drop-in-notes"
            name="notes"
            rows={4}
            placeholder="Interest, class time, referral source"
            className="min-h-24 w-full min-w-0 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </FormField>

        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Default amount: {formattedDefaultAmount}
        </p>

        <Button type="submit" size="lg" className="min-h-11">
          Stage entry
        </Button>

        <p aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
          {message}
        </p>
      </form>
    </aside>
  )
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground uppercase"
    >
      {label}
      {children}
    </label>
  )
}
