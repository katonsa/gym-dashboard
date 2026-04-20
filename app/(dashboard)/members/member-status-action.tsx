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
import type { MemberStatus } from "@/lib/dashboard"
import { updateMemberStatus, type ActionResult } from "./actions"

type StatusActionStatus = Extract<MemberStatus, "ACTIVE" | "SUSPENDED">

export function MemberStatusAction({
  memberId,
  memberName,
  status,
  compact = false,
}: {
  memberId: string
  memberName: string
  status: MemberStatus
  compact?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(false)
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

  function handleOpenChange(open: boolean) {
    setIsOpen(open)

    if (open) {
      setResult({ success: false })
      return
    }

    if (!isPending) {
      setResult({ success: false })
    }
  }

  function handleOpenConfirmation() {
    setResult({ success: false })
    setIsOpen(true)
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
        setIsOpen(false)
        toast.success(
          nextStatus === "SUSPENDED"
            ? `${memberName} is suspended.`
            : `${memberName} is active. Assign a new plan when ready.`
        )
        return
      }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={status === "ACTIVE" ? "destructive" : "outline"}
          size="sm"
          className="min-h-11"
          onClick={handleOpenConfirmation}
        >
          {actionLabel}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className={compact ? "sm:max-w-xs" : undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmation}</AlertDialogTitle>
          <AlertDialogDescription>
            {status === "ACTIVE"
              ? "This will suspend the member and mark any active memberships as past due."
              : "This will reactivate the member so you can assign a new plan afterward."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {result.error ? (
          <p className="text-sm leading-6 text-destructive">{result.error}</p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={status === "ACTIVE" ? "destructive" : "default"}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? pendingLabel : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
