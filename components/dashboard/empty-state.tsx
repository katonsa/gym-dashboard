import Link from "next/link"

import { Button } from "@/components/ui/button"

export function EmptyState({
  title,
  detail,
  actionLabel,
  actionHref,
  dashed = false,
}: {
  title: string
  detail: string
  actionLabel?: string
  actionHref?: string
  dashed?: boolean
}) {
  return (
    <div
      className={
        dashed
          ? "rounded-lg border border-dashed border-border bg-card p-4 text-card-foreground"
          : "rounded-lg border border-border bg-card p-5 text-card-foreground"
      }
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      {actionLabel && actionHref ? (
        <Button asChild variant="outline" size="sm" className="mt-4 min-h-11">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
