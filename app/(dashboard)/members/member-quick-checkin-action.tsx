"use client"

import { CheckCircle2 } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { logMemberCheckIn, type ActionResult } from "./actions"

export function MemberQuickCheckInAction({
  memberId,
  memberName,
  checkInDate,
  onResult,
}: {
  memberId: string
  memberName: string
  checkInDate: string
  onResult: (message: string) => void
}) {
  const [result, setResult] = React.useState<ActionResult>({
    success: false,
  })
  const [isPending, startTransition] = React.useTransition()

  function handleCheckIn() {
    setResult({ success: false })
    onResult(`Checking in ${memberName}...`)

    startTransition(async () => {
      const actionResult = await logMemberCheckIn({
        memberId,
        attendedAt: checkInDate,
      })

      setResult(actionResult)

      if (actionResult.success) {
        onResult(`${memberName} checked in.`)
        return
      }

      onResult(actionResult.error ?? "The check-in could not be logged.")
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
