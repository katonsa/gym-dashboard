"use client"

import { CircleCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { markPaymentPaid } from "./members/payment-actions.server"
import type { MarkPaidActionResult } from "@/lib/billing/schemas/mark-paid-schema"

type OverviewMarkPaidActionProps = {
  paymentId: string
  formattedAmount: string
}

export function OverviewMarkPaidAction({
  paymentId,
  formattedAmount,
}: OverviewMarkPaidActionProps) {
  const router = useRouter()
  const [result, setResult] = React.useState<MarkPaidActionResult>({
    success: false,
  })
  const [isPending, startTransition] = React.useTransition()

  function handleMarkPaid() {
    if (isPending) {
      return
    }

    setResult({ success: false })

    startTransition(async () => {
      const actionResult = await markPaymentPaid({ paymentId })

      setResult(actionResult)

      if (actionResult.success) {
        toast.success(`${formattedAmount} marked paid.`)
        router.refresh()
        return
      }

      if (actionResult.error) {
        toast.error(actionResult.error)
      }
    })
  }

  return (
    <div className="relative z-10 mt-3 grid gap-2">
      <Button
        type="button"
        size="sm"
        className="min-h-11 w-fit"
        disabled={isPending}
        onClick={handleMarkPaid}
      >
        <CircleCheck aria-hidden="true" />
        {isPending ? "Recording..." : "Mark paid"}
      </Button>
      {result.error ? (
        <p role="alert" className="text-xs leading-5 text-destructive">
          {result.error}
        </p>
      ) : null}
    </div>
  )
}
