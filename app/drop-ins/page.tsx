import {
  getDropInConversionOpportunities,
  mockDashboardAsOf,
  mockDashboardData,
  type DashboardData,
  type DropInVisit,
} from "@/lib/dashboard"
import { DropInEntryForm } from "./drop-in-entry-form"

const asOf = new Date(mockDashboardAsOf)

const moneyFormatter = new Intl.NumberFormat("en", {
  style: "currency",
  currency: mockDashboardData.gym.currencyCode,
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("en")
const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})
const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
})

const dropInRows = getDropInRows(mockDashboardData, asOf)
const dailyDropIns = getDropInsForDay(mockDashboardData.dropIns, asOf)
const monthlyDropIns = getDropInsForMonth(mockDashboardData.dropIns, asOf)
const frequentDropIns = getDropInConversionOpportunities(
  mockDashboardData.dropIns,
  { asOf, conversionVisitThreshold: 5 }
).toSorted((left, right) => right.visitCount - left.visitCount)

const summaryStats = [
  {
    label: "Today",
    value: moneyFormatter.format(sumDropInAmount(dailyDropIns)),
    detail: `${numberFormatter.format(sumVisitCount(dailyDropIns))} visits logged`,
    tone: "status",
  },
  {
    label: "This month",
    value: moneyFormatter.format(sumDropInAmount(monthlyDropIns)),
    detail: `${numberFormatter.format(sumVisitCount(monthlyDropIns))} visits collected`,
    tone: "revenue",
  },
  {
    label: "Frequent leads",
    value: numberFormatter.format(frequentDropIns.length),
    detail: "Identified visitors with 5+ visits",
    tone: "opportunity",
  },
]

const toneClasses: Record<string, string> = {
  opportunity: "bg-opportunity",
  revenue: "bg-revenue",
  status: "bg-status",
}

export default function DropInsPage() {
  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            Thursday, Apr 16
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
            {moneyFormatter.format(mockDashboardData.gym.defaultDropInFeeAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            New entries start from the gym day-pass price
          </p>
        </div>
      </section>

      <section aria-labelledby="drop-in-summary" className="grid gap-3">
        <div>
          <h2 id="drop-in-summary" className="text-base font-semibold">
            Drop-in summary
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Daily cash, month-to-date cash, and conversion candidates.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {summaryStats.map((stat) => (
            <article
              key={stat.label}
              className="min-h-32 rounded-lg border border-border bg-card p-4 text-card-foreground"
            >
              <div
                className={`mb-3 h-1.5 w-14 rounded-full ${toneClasses[stat.tone]}`}
              />
              <p className="text-xs font-medium text-muted-foreground uppercase">
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

        <div className="grid gap-3 md:grid-cols-2">
          {frequentDropIns.length > 0 ? (
            frequentDropIns.map((visitor) => (
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
            ))
          ) : (
            <article className="rounded-lg border border-border bg-card p-4 text-card-foreground md:col-span-2">
              <p className="text-sm font-medium">
                No identified visitors have reached 5 visits this month.
              </p>
            </article>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <section
          aria-labelledby="drop-in-log"
          className="grid min-w-0 content-start gap-3"
        >
          <div>
            <h2 id="drop-in-log" className="text-base font-semibold">
              Drop-in log
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Visitor details, visit counts, payment, and notes.
            </p>
          </div>

          <div className="grid gap-3 md:hidden">
            {dropInRows.map((dropIn) => (
              <DropInCard key={dropIn.id} dropIn={dropIn} />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border bg-card text-card-foreground md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-border bg-muted/60 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="w-[17%] px-4 py-3 font-medium">Date</th>
                  <th className="w-[21%] px-4 py-3 font-medium">Visitor</th>
                  <th className="w-[24%] px-4 py-3 font-medium">Contact</th>
                  <th className="w-[12%] px-4 py-3 font-medium">Visits</th>
                  <th className="w-[14%] px-4 py-3 font-medium">Paid</th>
                  <th className="w-[12%] px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dropInRows.map((dropIn) => (
                  <DropInTableRow key={dropIn.id} dropIn={dropIn} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <DropInEntryForm
          defaultAmount={mockDashboardData.gym.defaultDropInFeeAmount}
          formattedDefaultAmount={moneyFormatter.format(
            mockDashboardData.gym.defaultDropInFeeAmount
          )}
        />
      </section>
    </div>
  )
}

type DropInRow = {
  id: string
  dateLabel: string
  timeLabel: string
  visitorLabel: string
  contactLabel: string
  visitCountLabel: string
  amountLabel: string
  notesLabel: string
  identified: boolean
}

function DropInCard({ dropIn }: { dropIn: DropInRow }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">
            {dropIn.visitorLabel}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {dropIn.contactLabel}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {dropIn.identified ? "Identified" : "Anonymous"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DropInField label="Date" value={dropIn.dateLabel} />
        <DropInField label="Time" value={dropIn.timeLabel} />
        <DropInField label="Visits" value={dropIn.visitCountLabel} />
        <DropInField label="Paid" value={dropIn.amountLabel} />
      </div>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        {dropIn.notesLabel}
      </p>
    </article>
  )
}

function DropInTableRow({ dropIn }: { dropIn: DropInRow }) {
  return (
    <tr>
      <td className="px-4 py-3 align-top">
        <p className="font-medium">{dropIn.dateLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {dropIn.timeLabel}
        </p>
      </td>
      <td className="px-4 py-3 align-top">
        <p className="truncate font-medium">{dropIn.visitorLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {dropIn.identified ? "Identified visitor" : "Walk-in group"}
        </p>
      </td>
      <td className="px-4 py-3 align-top text-muted-foreground">
        <p className="truncate">{dropIn.contactLabel}</p>
      </td>
      <td className="px-4 py-3 align-top font-semibold">
        {dropIn.visitCountLabel}
      </td>
      <td className="px-4 py-3 align-top font-semibold">
        {dropIn.amountLabel}
      </td>
      <td className="px-4 py-3 align-top text-muted-foreground">
        <p className="line-clamp-2">{dropIn.notesLabel}</p>
      </td>
    </tr>
  )
}

function DropInField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  )
}

function getDropInRows(data: DashboardData, currentDate: Date): DropInRow[] {
  return data.dropIns
    .toSorted((left, right) => right.visitedAt.localeCompare(left.visitedAt))
    .map((dropIn) => {
      const visitedAt = new Date(dropIn.visitedAt)
      const isCurrentMonth = isSameMonth(dropIn.visitedAt, currentDate)

      return {
        id: dropIn.id,
        dateLabel: dateFormatter.format(visitedAt),
        timeLabel: timeFormatter.format(visitedAt),
        visitorLabel:
          dropIn.visitorName ??
          `Anonymous drop-in${dropIn.visitCount > 1 ? " group" : ""}`,
        contactLabel: dropIn.visitorContact ?? "No contact captured",
        visitCountLabel: numberFormatter.format(dropIn.visitCount),
        amountLabel: moneyFormatter.format(dropIn.amount),
        notesLabel:
          dropIn.notes ??
          (isCurrentMonth
            ? "No notes recorded."
            : "Previous-month reference entry."),
        identified: Boolean(dropIn.visitorName || dropIn.visitorContact),
      } satisfies DropInRow
    })
}

function getDropInsForDay(dropIns: DropInVisit[], day: Date) {
  return dropIns.filter((dropIn) => isSameDay(dropIn.visitedAt, day))
}

function getDropInsForMonth(dropIns: DropInVisit[], month: Date) {
  return dropIns.filter((dropIn) => isSameMonth(dropIn.visitedAt, month))
}

function sumDropInAmount(dropIns: DropInVisit[]) {
  return dropIns.reduce((total, dropIn) => total + dropIn.amount, 0)
}

function sumVisitCount(dropIns: DropInVisit[]) {
  return dropIns.reduce((total, dropIn) => total + dropIn.visitCount, 0)
}

function isSameDay(date: string, day: Date) {
  const value = new Date(date)

  return (
    value.getUTCFullYear() === day.getUTCFullYear() &&
    value.getUTCMonth() === day.getUTCMonth() &&
    value.getUTCDate() === day.getUTCDate()
  )
}

function isSameMonth(date: string, month: Date) {
  const value = new Date(date)

  return (
    value.getUTCFullYear() === month.getUTCFullYear() &&
    value.getUTCMonth() === month.getUTCMonth()
  )
}
