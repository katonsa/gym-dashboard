"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { MembershipStatus } from "@/lib/dashboard"
import { renewMembership } from "./members/actions"
import type { RenewMembershipActionResult } from "./members/renew-membership-schema"

type OverviewRenewalActionProps = {
  membershipId: string
  expectedStatus: Extract<MembershipStatus, "ACTIVE" | "EXPIRED">
  expectedCurrentPeriodEndsAt: string
}

export function OverviewRenewalAction({
  membershipId,
  expectedStatus,
  expectedCurrentPeriodEndsAt,
}: OverviewRenewalActionProps) {
  const router = useRouter()
  const [result, setResult] = React.useState<RenewMembershipActionResult>({
    success: false,
  })
  const [isPending, startTransition] = React.useTransition()

  function handleRenew() {
    if (isPending) {
      return
    }

    setResult({ success: false })

    startTransition(async () => {
      const actionResult = await renewMembership({
        membershipId,
        expectedStatus,
        expectedCurrentPeriodEndsAt,
        submissionId: crypto.randomUUID(),
      })

      setResult(actionResult)

      if (actionResult.success) {
        toast.success("Membership renewed.")
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
        onClick={handleRenew}
      >
        <RefreshCw aria-hidden="true" />
        {isPending ? "Renewing..." : "Renew"}
      </Button>
      {result.error ? (
        <p role="alert" className="text-xs leading-5 text-destructive">
          {result.error}
        </p>
      ) : null}
    </div>
  )
}
