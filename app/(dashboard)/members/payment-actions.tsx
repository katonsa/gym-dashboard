"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { PaymentStatus } from "@/lib/dashboard"
import {
  markPaymentPaid,
  voidPayment,
  type ActionResult,
} from "./payment-actions.server"

type PaymentActionsProps = {
  paymentId: string
  paymentStatus: PaymentStatus
  formattedAmount: string
}

export function PaymentActions({
  paymentId,
  paymentStatus,
  formattedAmount,
}: PaymentActionsProps) {
  if (paymentStatus === "PAID" || paymentStatus === "VOID") {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      <MarkPaidAction paymentId={paymentId} formattedAmount={formattedAmount} />
      <VoidPaymentAction
        paymentId={paymentId}
        formattedAmount={formattedAmount}
      />
    </div>
  )
}

function MarkPaidAction({
  paymentId,
  formattedAmount,
}: {
  paymentId: string
  formattedAmount: string
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [result, setResult] = React.useState<ActionResult>({
    success: false,
  })
  const [isPending, startTransition] = React.useTransition()

  function handleOpenChange(open: boolean) {
    setIsOpen(open)

    if (open) {
      setResult({ success: false })
    }
  }

  function handleConfirm() {
    setResult({ success: false })

    startTransition(async () => {
      const actionResult = await markPaymentPaid({ paymentId })

      setResult(actionResult)

      if (actionResult.success) {
        setIsOpen(false)
        toast.success("Payment marked paid.")
        return
      }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="default" size="sm" className="min-h-11">
          Mark paid
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Record {formattedAmount} as paid?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the payment as collected today. If this resolves the
            last outstanding payment on the membership, the membership will be
            reactivated automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {result.error ? (
          <p className="text-sm leading-6 text-destructive">{result.error}</p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault()
              handleConfirm()
            }}
          >
            {isPending ? "Recording..." : "Mark paid"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function VoidPaymentAction({
  paymentId,
  formattedAmount,
}: {
  paymentId: string
  formattedAmount: string
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [result, setResult] = React.useState<ActionResult>({
    success: false,
  })
  const [isPending, startTransition] = React.useTransition()

  function handleOpenChange(open: boolean) {
    setIsOpen(open)

    if (open) {
      setResult({ success: false })
      setReason("")
    }
  }

  function handleConfirm() {
    setResult({ success: false })

    startTransition(async () => {
      const actionResult = await voidPayment({
        paymentId,
        reason: reason || undefined,
      })

      setResult(actionResult)

      if (actionResult.success) {
        setIsOpen(false)
        toast.success("Payment voided.")
        return
      }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="min-h-11">
          Void
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Void this {formattedAmount} payment?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This payment will be removed from billing calculations. This cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <label
            htmlFor="void-reason"
            className="text-xs font-medium text-muted-foreground"
          >
            Reason (optional)
          </label>
          <textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={2}
            disabled={isPending}
            placeholder="Why is this payment being voided?"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50"
          />
        </div>
        {result.error ? (
          <p className="text-sm leading-6 text-destructive">{result.error}</p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault()
              handleConfirm()
            }}
          >
            {isPending ? "Voiding..." : "Void payment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
