import type { Metadata } from "next"
import { BadgeDollarSign, FileDown } from "lucide-react"

import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { formatDashboardDate } from "@/lib/dashboard/formatters"
import {
  loadDropInLogPage,
  loadDropInSummary,
  loadDropInVisitorLookupOptions,
} from "@/lib/dashboard/loaders"
import { parsePaginationParams } from "@/lib/domain/pagination"
import { DropInEntryForm } from "./drop-in-entry-form"
import { DropInLog } from "./drop-in-log"
import { DropInSummarySection } from "./drop-in-summary"

export const metadata: Metadata = {
  title: "Drop-ins",
}

type DropInsPageProps = {
  searchParams: Promise<{
    page?: string | string[]
  }>
}

export default async function DropInsPage({ searchParams }: DropInsPageProps) {
  const pagination = await parsePaginationParams(searchParams)
  const asOf = new Date()
  const [dropInsData, dropInLogPage, visitorLookupOptions] = await Promise.all([
    loadDropInSummary({ asOf, conversionVisitThreshold: 5 }),
    loadDropInLogPage(pagination),
    loadDropInVisitorLookupOptions(),
  ])

  if (!dropInsData || !dropInLogPage || !visitorLookupOptions) {
    return (
      <EmptyState
        title="No gym is connected to this owner account."
        detail="Create or assign a gym for this owner before drop-in records can appear."
      />
    )
  }

  const moneyFormatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: dropInsData.gym.currencyCode,
    maximumFractionDigits: 0,
  })
  const { dropInSummary } = dropInsData
  const frequentDropIns = dropInSummary.conversionLeads
  const setupGaps = [
    !dropInSummary.hasDropIns
      ? {
          title: "No drop-ins yet.",
          detail:
            "Log walk-in visits to start tracking cash and follow-up leads.",
        }
      : null,
  ].filter((gap): gap is { title: string; detail: string } => Boolean(gap))

  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div className="min-w-0">
          <p className="inline-flex min-h-7 items-center rounded-lg border border-primary/25 bg-primary/10 px-2.5 text-xs font-semibold text-primary uppercase">
            {formatDashboardDate(asOf, dropInsData.gym.timezone)}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
            Drop-in desk
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Log walk-ins fast, watch day-pass cash, and surface returning
            visitors before they leave.
          </p>
        </div>
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BadgeDollarSign className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Default day pass
              </p>
              <p className="mt-1 text-2xl leading-8 font-semibold break-words">
                {moneyFormatter.format(dropInsData.gym.defaultDropInFeeAmount)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">
              Used as the starting amount for every new drop-in.
            </p>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-11 sm:w-fit"
            >
              <a href="/api/exports/drop-ins">
                <FileDown />
                Export
              </a>
            </Button>
          </div>
        </div>
      </section>

      {setupGaps.length > 0 ? (
        <section aria-labelledby="drop-in-setup" className="grid gap-3">
          <div>
            <h2 id="drop-in-setup" className="text-base font-semibold">
              Setup status
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Drop-ins will fill this view after records are saved.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {setupGaps.map((gap) => (
              <EmptyState
                key={gap.title}
                title={gap.title}
                detail={gap.detail}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start">
        <div className="grid min-w-0 gap-5 lg:gap-6">
          <DropInSummarySection
            dropInSummary={dropInSummary}
            frequentDropIns={frequentDropIns}
            moneyFormatter={moneyFormatter}
          />

          <DropInLog
            asOf={asOf}
            dropInLogPage={dropInLogPage}
            moneyFormatter={moneyFormatter}
          />
        </div>
        <DropInEntryForm
          defaultAmount={dropInsData.gym.defaultDropInFeeAmount}
          formattedDefaultAmount={moneyFormatter.format(
            dropInsData.gym.defaultDropInFeeAmount
          )}
          visitorLookupOptions={visitorLookupOptions}
        />
      </section>
    </div>
  )
}
