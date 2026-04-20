import { EmptyState } from "@/components/dashboard/empty-state"
import { formatDashboardDate, parsePaginationParams } from "@/lib/dashboard"
import {
  loadDropInLogPage,
  loadDropInSummary,
  loadDropInVisitorLookupOptions,
} from "@/lib/dashboard/loaders"
import { DropInEntryForm } from "./drop-in-entry-form"
import { DropInLog } from "./drop-in-log"
import { DropInSummarySection } from "./drop-in-summary"

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
      <section className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            {formatDashboardDate(asOf, dropInsData.gym.timezone)}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
            Drop-ins
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Day-pass cash, walk-in volume, and follow-up leads.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Default fee
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {moneyFormatter.format(dropInsData.gym.defaultDropInFeeAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            New entries start from the gym day-pass price
          </p>
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

      <DropInSummarySection
        dropInSummary={dropInSummary}
        frequentDropIns={frequentDropIns}
        moneyFormatter={moneyFormatter}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <DropInLog
          asOf={asOf}
          dropInLogPage={dropInLogPage}
          moneyFormatter={moneyFormatter}
        />

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
