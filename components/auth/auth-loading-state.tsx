function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />
}

export function AuthLoadingState() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-sm flex-col justify-center">
      <LoadingBlock className="h-3 w-24" />
      <LoadingBlock className="mt-3 h-9 w-40 max-w-full" />
      <LoadingBlock className="mt-3 h-4 w-full" />
      <LoadingBlock className="mt-2 h-4 w-5/6" />

      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <LoadingBlock className="h-3 w-16" />
            <LoadingBlock className="h-11 w-full" />
          </div>
          <div className="space-y-2">
            <LoadingBlock className="h-3 w-20" />
            <LoadingBlock className="h-11 w-full" />
          </div>
          <LoadingBlock className="h-11 w-full" />
        </div>
      </div>
    </div>
  )
}
