import { Banknote, CalendarDays, UserRoundCheck } from "lucide-react"

import { toneClasses } from "@/lib/dashboard/status-styles"
import type {
  DropInConversionLead,
  DropInSummary,
} from "@/lib/dashboard/read-models/aggregates"

const numberFormatter = new Intl.NumberFormat("en")

export function DropInSummarySection({
  dropInSummary,
  frequentDropIns,
  moneyFormatter,
}: {
  dropInSummary: DropInSummary
  frequentDropIns: DropInConversionLead[]
  moneyFormatter: Intl.NumberFormat
}) {
  const summaryStats = [
    {
      label: "Today",
      value: moneyFormatter.format(dropInSummary.dailyTotal.revenueAmount),
      detail: `${numberFormatter.format(dropInSummary.dailyTotal.visitCount)} visits logged`,
      tone: "status",
      iconClass: "bg-status/15 text-status",
      icon: Banknote,
    },
    {
      label: "This month",
      value: moneyFormatter.format(dropInSummary.monthlyTotal.revenueAmount),
      detail: `${numberFormatter.format(dropInSummary.monthlyTotal.visitCount)} visits collected`,
      tone: "revenue",
      iconClass: "bg-revenue/15 text-revenue",
      icon: CalendarDays,
    },
    {
      label: "Frequent leads",
      value: numberFormatter.format(frequentDropIns.length),
      detail: "Identified visitors with 5+ visits",
      tone: "opportunity",
      iconClass: "bg-opportunity/15 text-opportunity",
      icon: UserRoundCheck,
    },
  ]

  return (
    <section aria-labelledby="drop-in-summary" className="grid gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="drop-in-summary" className="text-base font-semibold">
            Floor snapshot
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Cash, traffic, and follow-up pressure for the current gym day.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {summaryStats.map((stat) => (
          <article
            key={stat.label}
            className="min-h-32 rounded-lg border border-border bg-card p-4 text-card-foreground"
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={`flex size-9 items-center justify-center rounded-lg ${stat.iconClass}`}
              >
                <stat.icon className="size-4" />
              </div>
              <div
                className={`mt-1 h-1.5 w-12 rounded-full ${toneClasses[stat.tone]}`}
              />
            </div>
            <p className="mt-4 text-xs font-medium text-muted-foreground uppercase">
              {stat.label}
            </p>
            <p className="mt-2 text-xl leading-7 font-semibold break-words">
              {stat.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {stat.detail}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Follow-up queue</h3>
          <span className="rounded-lg border border-opportunity/35 bg-opportunity/12 px-2 py-1 text-xs font-medium text-opportunity">
            {numberFormatter.format(frequentDropIns.length)} leads
          </span>
        </div>
        {frequentDropIns.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {frequentDropIns.map((visitor) => (
              <article
                key={visitor.visitorContact}
                className="rounded-lg border border-opportunity/35 bg-card p-4 text-card-foreground"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">
                      {visitor.visitorName}
                    </h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {visitor.visitorContact}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-opportunity/12 px-2 py-1 text-xs font-medium text-opportunity">
                    {numberFormatter.format(visitor.visitCount)} visits
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {moneyFormatter.format(visitor.revenueAmount)} collected this
                  month.
                </p>
              </article>
            ))}
          </div>
        ) : (
          <article className="rounded-lg border border-border bg-card p-4 text-card-foreground">
            <p className="text-sm font-medium">
              No identified visitors have reached 5 visits this month.
            </p>
          </article>
        )}
      </div>
    </section>
  )
}
