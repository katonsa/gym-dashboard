import type * as React from "react"

import { cn } from "@/lib/utils"

export function DetailField({
  label,
  value,
  truncate = false,
}: {
  label: string
  value: React.ReactNode
  truncate?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-medium",
          truncate ? "truncate" : "break-words"
        )}
      >
        {value}
      </p>
    </div>
  )
}
