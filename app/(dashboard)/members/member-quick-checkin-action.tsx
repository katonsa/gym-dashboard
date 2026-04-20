"use client"

import { CheckCircle2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { logMemberCheckIn, type ActionResult } from "./member-actions"

export function MemberQuickCheckInAction({
  memberId,
  memberName,
  checkInDate,
}: {
  memberId: string
  memberName: string
  checkInDate: string
}) {
  const [result, setResult] = React.useState<ActionResult>({
    success: false,
  })
  const [isPending, startTransition] = React.useTransition()

  function handleCheckIn() {
    setResult({ success: false })

    startTransition(async () => {
      const actionResult = await logMemberCheckIn({
        memberId,
        attendedAt: checkInDate,
      })

      setResult(actionResult)

      if (actionResult.success) {
        toast.success(`${memberName} checked in.`)
        return
      }

      toast.error(actionResult.error ?? "The check-in could not be logged.")
    })
  }

  return (
    <Button
      type="button"
      variant={result.success ? "secondary" : "default"}
      size="sm"
      className="min-h-11"
      disabled={isPending}
      onClick={handleCheckIn}
    >
      <CheckCircle2 />
      {isPending ? "Checking..." : result.success ? "Checked in" : "Check in"}
    </Button>
  )
}
