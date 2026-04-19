"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addBillingPeriod } from "@/lib/dashboard/billing"
import { getDaysBetween } from "@/lib/dashboard/calculations"
import type { MembershipDisplayStatus } from "@/lib/dashboard/calculations"
import type { BillingInterval, MembershipStatus } from "@/lib/dashboard/types"
import { renewMembership } from "./actions"
import type { RenewMembershipActionResult } from "./renew-membership-schema"

type MemberRenewalActionProps = {
  membershipId: string
  expectedStatus: Extract<MembershipStatus, "ACTIVE" | "EXPIRED">
  expectedCurrentPeriodEndsAt: string
  canRenew: boolean
  displayStatus: MembershipDisplayStatus
  planName: string
  billingInterval: BillingInterval
  formattedAmount: string
  defaultRenewalDate: string
  asOf: string
  timeZone: string
}

export function MemberRenewalAction({
  membershipId,
  expectedStatus,
  expectedCurrentPeriodEndsAt,
  canRenew,
  displayStatus,
  planName,
  billingInterval,
  formattedAmount,
  defaultRenewalDate,
  asOf,
  timeZone,
}: MemberRenewalActionProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const [submissionId, setSubmissionId] = React.useState("")
  const [renewalDate, setRenewalDate] = React.useState(defaultRenewalDate)
  const [result, setResult] = React.useState<RenewMembershipActionResult>({
    success: false,
  })
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const isExpired = displayStatus === "expired"
  const periodEndDate = React.useMemo(
    () => new Date(expectedCurrentPeriodEndsAt),
    [expectedCurrentPeriodEndsAt]
  )
  const renewalBasisDate = isExpired
    ? parseDateInput(renewalDate)
    : periodEndDate
  const nextPeriodEnd = renewalBasisDate
    ? addBillingPeriod(renewalBasisDate, billingInterval)
    : null
  const mayNeedAnotherRenewal =
    isExpired &&
    nextPeriodEnd !== null &&
    nextPeriodEnd.getTime() < new Date(asOf).getTime()
  const daysExpired = Math.max(
    1,
    getDaysBetween(expectedCurrentPeriodEndsAt, asOf)
  )

  function handleOpenChange(open: boolean) {
    setIsOpen(open)

    if (open) {
      setSubmissionId(crypto.randomUUID())
      setRenewalDate(defaultRenewalDate)
      setResult({ success: false })
      setSuccessMessage("")
    }
  }

  function handleConfirm() {
    if (!submissionId || isPending) {
      return
    }

    setResult({ success: false })
    setSuccessMessage("")

    startTransition(async () => {
      const actionResult = await renewMembership({
        membershipId,
        expectedStatus,
        expectedCurrentPeriodEndsAt,
        submissionId,
        renewalDate: isExpired ? renewalDate : undefined,
      })

      setResult(actionResult)

      if (actionResult.success) {
        const nextPeriodDetail = nextPeriodEnd
          ? ` Next period ends ${formatDate(nextPeriodEnd, timeZone)}.`
          : ""

        setIsOpen(false)
        setSuccessMessage(`Membership renewed.${nextPeriodDetail}`)
        router.refresh()
      }
    })
  }

  return (
    <>
      {canRenew ? (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger asChild>
            <Button type="button" size="sm" className="min-h-11">
              Renew
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Renew {planName} ({titleCase(billingInterval)})?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isExpired
                  ? `The membership expired ${formatDaysExpired(
                      daysExpired
                    )}. A new billing period will start on ${formatDateInputForDisplay(
                      renewalDate
                    )} and a payment of ${formattedAmount} will be recorded as pending.`
                  : `A new billing period will start on ${formatDate(
                      periodEndDate,
                      timeZone
                    )} and a payment of ${formattedAmount} will be recorded as pending.`}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {isExpired ? (
              <div className="grid gap-2">
                <Label htmlFor={`renewal-date-${membershipId}`}>
                  Renewal date
                </Label>
                <Input
                  id={`renewal-date-${membershipId}`}
                  type="date"
                  value={renewalDate}
                  max={defaultRenewalDate}
                  disabled={isPending}
                  onChange={(event) => setRenewalDate(event.target.value)}
                  className="min-h-11"
                />
                {mayNeedAnotherRenewal ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    This renewal may not bring the membership current. Another
                    renewal may be needed after this one.
                  </p>
                ) : null}
              </div>
            ) : null}

            {result.error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
              >
                {result.error}
              </p>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending || (isExpired && !renewalDate)}
                onClick={(event) => {
                  event.preventDefault()
                  handleConfirm()
                }}
              >
                {isPending ? "Renewing..." : "Renew membership"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <p aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
        {successMessage}
      </p>
    </>
  )
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, monthIndex, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function formatDaysExpired(days: number) {
  return days === 1 ? "1 day ago" : `${days} days ago`
}

function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone,
    year: "numeric",
  }).format(date)
}

function formatDateInputForDisplay(value: string) {
  const date = parseDateInput(value)

  if (!date) {
    return value || "the selected renewal date"
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date)
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
