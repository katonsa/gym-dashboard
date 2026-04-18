"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function DashboardErrorState({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-alert/35 bg-card p-5 text-card-foreground sm:p-6">
        <p className="text-xs font-semibold text-alert uppercase">
          Dashboard unavailable
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-balance">
          This section could not be loaded.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Retry the request to fetch the latest data again. If the issue
          persists, refresh the page and inspect the server logs.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => unstable_retry()}>
            Try again
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Back to overview</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
