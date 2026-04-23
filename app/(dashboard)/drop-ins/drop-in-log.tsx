import { Clock3, ReceiptText, UserRound } from "lucide-react"

import { DetailField } from "@/components/dashboard/detail-field"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PaginationNav } from "@/components/ui/pagination-nav"
import type { DropInVisit } from "@/lib/domain/types"

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

type DropInLogPage = {
  rows: DropInVisit[]
  page: number
  pageCount: number
  pageSize: number
  total: number
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

export function DropInLog({
  asOf,
  dropInLogPage,
  moneyFormatter,
}: {
  asOf: Date
  dropInLogPage: DropInLogPage
  moneyFormatter: Intl.NumberFormat
}) {
  const dropInRows = getDropInRows(dropInLogPage.rows, asOf, moneyFormatter)

  return (
    <section
      aria-labelledby="drop-in-log"
      className="grid min-w-0 content-start gap-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="drop-in-log" className="text-base font-semibold">
            Recent walk-ins
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Visitor details, visit counts, payment, and notes.
          </p>
        </div>
        <div className="min-h-7 w-fit rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {dropInLogPage.total > 0
            ? `Showing ${getPageRangeLabel(dropInLogPage)}`
            : "No records"}
        </div>
      </div>

      <div className="grid gap-3 2xl:hidden">
        {dropInRows.length > 0 ? (
          dropInRows.map((dropIn) => (
            <DropInCard key={dropIn.id} dropIn={dropIn} />
          ))
        ) : (
          <EmptyState
            title="No drop-ins yet."
            detail="Saved walk-ins will appear in this log."
          />
        )}
      </div>

      {dropInRows.length > 0 ? (
        <div className="grid gap-3">
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card text-card-foreground 2xl:block">
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

          <PaginationNav
            page={dropInLogPage.page}
            pageCount={dropInLogPage.pageCount}
            basePath="/drop-ins"
          />
        </div>
      ) : (
        <div className="hidden 2xl:block">
          <EmptyState
            title="No drop-ins yet."
            detail="Saved walk-ins will appear in this log."
          />
        </div>
      )}
    </section>
  )
}

function DropInCard({ dropIn }: { dropIn: DropInRow }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              {dropIn.visitorLabel}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {dropIn.contactLabel}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {dropIn.identified ? "Identified" : "Anonymous"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DetailField label="Date" value={dropIn.dateLabel} truncate />
        <DetailField label="Time" value={dropIn.timeLabel} truncate />
        <DetailField label="Visits" value={dropIn.visitCountLabel} truncate />
        <DetailField label="Paid" value={dropIn.amountLabel} truncate />
      </div>

      <div className="mt-4 flex gap-2 rounded-lg bg-muted px-3 py-2">
        <ReceiptText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-5 text-muted-foreground">
          {dropIn.notesLabel}
        </p>
      </div>
    </article>
  )
}

function DropInTableRow({ dropIn }: { dropIn: DropInRow }) {
  return (
    <tr>
      <td className="px-4 py-3 align-top">
        <p className="font-medium">{dropIn.dateLabel}</p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="size-3" />
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

function getDropInRows(
  dropIns: DropInVisit[],
  currentDate: Date,
  moneyFormatter: Intl.NumberFormat
): DropInRow[] {
  return dropIns
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

function getPageRangeLabel({
  page,
  pageSize,
  total,
}: {
  page: number
  pageSize: number
  total: number
}) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)

  return `${numberFormatter.format(start)}-${numberFormatter.format(end)} of ${numberFormatter.format(total)}`
}

function isSameMonth(date: string, month: Date) {
  const value = new Date(date)

  return (
    value.getUTCFullYear() === month.getUTCFullYear() &&
    value.getUTCMonth() === month.getUTCMonth()
  )
}
