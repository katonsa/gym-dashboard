import type * as React from "react"

export function InfoCard({
  id,
  title,
  detail,
  action,
  children,
}: {
  id?: string
  title: string
  detail?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {detail ? (
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
