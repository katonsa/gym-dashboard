import {
  formatAttendanceSource,
  formatDate,
  type AttendanceRecord,
} from "@/lib/dashboard"

export function AttendanceLogItem({
  record,
  timeZone,
}: {
  record: AttendanceRecord
  timeZone: string
}) {
  return (
    <article className="flex min-h-11 flex-col justify-center rounded-lg border border-border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium">
        {formatDate(record.attendedAt, timeZone)}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatAttendanceSource(record.source)}
      </p>
    </article>
  )
}
