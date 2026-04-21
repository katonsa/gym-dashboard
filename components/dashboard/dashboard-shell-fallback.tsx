function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />
}

export function DashboardShellFallback() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="flex min-h-svh">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground lg:flex lg:flex-col">
          <div className="mb-7 flex items-center gap-3 px-2">
            <LoadingBlock className="size-9 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <LoadingBlock className="h-4 w-32" />
              <LoadingBlock className="h-3 w-24" />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3"
              >
                <LoadingBlock className="size-4 rounded-md" />
                <LoadingBlock className="h-4 w-24" />
              </div>
            ))}
          </div>

          <div className="grid gap-2 border-t border-sidebar-border pt-4">
            <LoadingBlock className="h-11 w-full" />
            <LoadingBlock className="h-11 w-full" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <LoadingBlock className="size-9 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <LoadingBlock className="h-4 w-28" />
                  <LoadingBlock className="h-3 w-20" />
                </div>
              </div>

              <div className="hidden min-w-0 lg:block">
                <LoadingBlock className="h-3 w-24" />
                <LoadingBlock className="mt-2 h-4 w-56" />
              </div>

              <div className="flex items-center gap-2">
                <LoadingBlock className="size-9 rounded-lg" />
                <LoadingBlock className="size-9 rounded-lg" />
              </div>
            </div>
          </header>

          <main className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-4 pt-5 pb-28 lg:px-8 lg:pt-7 lg:pb-10">
            <section className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-end">
              <div className="space-y-3">
                <LoadingBlock className="h-3 w-40" />
                <LoadingBlock className="h-9 w-72 max-w-full" />
                <LoadingBlock className="h-4 w-full max-w-2xl" />
                <LoadingBlock className="h-4 w-full max-w-xl" />
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <LoadingBlock className="h-3 w-24" />
                <LoadingBlock className="mt-3 h-9 w-20" />
                <LoadingBlock className="mt-3 h-4 w-full" />
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <LoadingBlock className="h-3 w-24" />
                  <LoadingBlock className="mt-3 h-8 w-16" />
                  <LoadingBlock className="mt-4 h-4 w-full" />
                  <LoadingBlock className="mt-2 h-4 w-5/6" />
                </div>
              ))}
            </section>

            <section className="grid gap-3 xl:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <LoadingBlock className="h-4 w-40" />
                  <LoadingBlock className="mt-2 h-3 w-56 max-w-full" />
                  <div className="mt-4 grid gap-3">
                    {Array.from({ length: 4 }).map((_, rowIndex) => (
                      <LoadingBlock
                        key={rowIndex}
                        className="h-12 w-full rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`flex min-h-12 basis-0 items-center justify-center rounded-md px-1.5 ${
                index === 0 ? "flex-[1.8] gap-2 px-3" : "flex-1"
              }`}
            >
              <LoadingBlock className="size-5 rounded-md" />
              {index === 0 ? <LoadingBlock className="h-3 w-16" /> : null}
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function DashboardRouteLoading() {
  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div className="space-y-3">
          <LoadingBlock className="h-3 w-36" />
          <LoadingBlock className="h-9 w-64 max-w-full" />
          <LoadingBlock className="h-4 w-full max-w-2xl" />
          <LoadingBlock className="h-4 w-full max-w-xl" />
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <LoadingBlock className="h-3 w-24" />
          <LoadingBlock className="mt-3 h-8 w-20" />
          <LoadingBlock className="mt-3 h-4 w-full" />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-card p-4"
          >
            <LoadingBlock className="h-3 w-20" />
            <LoadingBlock className="mt-3 h-8 w-16" />
            <LoadingBlock className="mt-4 h-4 w-full" />
            <LoadingBlock className="mt-2 h-4 w-5/6" />
          </div>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-card p-4"
          >
            <LoadingBlock className="h-4 w-40" />
            <LoadingBlock className="mt-2 h-3 w-56 max-w-full" />
            <div className="mt-4 grid gap-3">
              {Array.from({ length: 4 }).map((_, rowIndex) => (
                <LoadingBlock
                  key={rowIndex}
                  className="h-12 w-full rounded-lg"
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
