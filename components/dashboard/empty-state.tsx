import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

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
    <Empty
      className={
        dashed
          ? "items-start rounded-lg border border-dashed border-border bg-card p-4 text-left text-card-foreground"
          : "items-start rounded-lg border border-border bg-card p-5 text-left text-card-foreground"
      }
    >
      <EmptyHeader className="items-start gap-1">
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription className="text-xs leading-5">
          {detail}
        </EmptyDescription>
      </EmptyHeader>
      {actionLabel && actionHref ? (
        <EmptyContent className="items-start">
          <Button asChild variant="outline" size="sm" className="min-h-11">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}
