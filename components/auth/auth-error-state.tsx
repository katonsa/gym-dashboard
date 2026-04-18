"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export function AuthErrorState({
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
    <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-sm flex-col justify-center">
      <div className="rounded-lg border border-alert/35 bg-card p-5 text-card-foreground sm:p-6">
        <p className="text-xs font-semibold text-alert uppercase">
          Sign-in unavailable
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">
          We could not load this page.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Retry the request to reload the sign-in flow. If it keeps failing,
          confirm the auth and database configuration.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-5">
          <Button size="lg" onClick={() => unstable_retry()}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
