"use client"

import * as React from "react"
import { FileDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function MonthlyReportExportForm({
  initialMonth,
}: {
  initialMonth: string
}) {
  const [month, setMonth] = React.useState(initialMonth)

  return (
    <form
      action="/api/exports/monthly-report"
      method="GET"
      className="grid gap-2"
    >
      <label className="grid gap-1 text-xs font-medium text-muted-foreground uppercase">
        Report month
        <Input
          type="month"
          name="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="min-h-11"
        />
      </label>
      <Button
        type="submit"
        size="lg"
        variant="outline"
        className="min-h-11 w-full"
        disabled={!month}
      >
        <FileDown />
        Monthly report
      </Button>
    </form>
  )
}
