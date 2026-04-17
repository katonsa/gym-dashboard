"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import type { MemberStatus } from "@/lib/dashboard"
import { cn } from "@/lib/utils"
import { updateMemberStatus, type ActionResult } from "./actions"

type StatusActionStatus = Extract<MemberStatus, "ACTIVE" | "SUSPENDED">

export function MemberStatusAction({
  memberId,
  memberName,
  status,
  compact = false,
  onResult,
}: {
  memberId: string
  memberName: string
  status: MemberStatus
  compact?: boolean
  onResult?: (message: string) => void
}) {
  const [isConfirming, setIsConfirming] = React.useState(false)
  const [result, setResult] = React.useState<ActionResult>({
    success: false,
  })
  const [isPending, startTransition] = React.useTransition()

  if (status === "INACTIVE") {
    return null
  }

  const nextStatus: StatusActionStatus =
    status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"
  const actionLabel = status === "ACTIVE" ? "Suspend" : "Unsuspend"
  const pendingLabel = status === "ACTIVE" ? "Suspending..." : "Unsuspending..."
  const confirmation =
    status === "ACTIVE"
      ? `Suspend ${memberName}? Active memberships will be paused.`
      : `Unsuspend ${memberName}? You can assign a new plan afterward.`

  function handleOpenConfirmation() {
    setResult({ success: false })
    setIsConfirming(true)
    onResult?.(confirmation)
  }

  function handleCancel() {
    setIsConfirming(false)
    setResult({ success: false })
    onResult?.("")
  }

  function handleConfirm() {
    setResult({ success: false })

    startTransition(async () => {
      const actionResult = await updateMemberStatus({
        memberId,
        status: nextStatus,
      })

      setResult(actionResult)

      if (actionResult.success) {
        setIsConfirming(false)
        onResult?.(
          nextStatus === "SUSPENDED"
            ? `${memberName} is suspended.`
            : `${memberName} is active. Assign a new plan when ready.`
        )
        return
      }

      onResult?.(
        actionResult.error ?? "The member status could not be changed."
      )
    })
  }

  if (!isConfirming) {
    return (
      <Button
        type="button"
        variant={status === "ACTIVE" ? "destructive" : "outline"}
        size="sm"
        className="min-h-11"
        onClick={handleOpenConfirmation}
      >
        {actionLabel}
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "grid gap-2 rounded-lg border border-border bg-background p-2",
        compact ? "min-w-32" : "w-full min-w-52"
      )}
    >
      <p className="text-xs leading-5 text-muted-foreground">{confirmation}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={status === "ACTIVE" ? "destructive" : "default"}
          size="sm"
          className="min-h-11"
          disabled={isPending}
          onClick={handleConfirm}
        >
          {isPending ? pendingLabel : actionLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={isPending}
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </div>
      {result.error ? (
        <p className="text-xs leading-5 text-destructive">{result.error}</p>
      ) : null}
    </div>
  )
}
