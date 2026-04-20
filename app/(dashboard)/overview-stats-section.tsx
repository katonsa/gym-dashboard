import { EmptyState } from "@/components/dashboard/empty-state"
import { toneClasses } from "@/lib/dashboard/status-styles"

export type OverviewStat = {
  label: string
  value: string
  detail: string
  tone: string
}

export function OverviewStatsSection({
  stats,
  hasActivity,
}: {
  stats: OverviewStat[]
  hasActivity: boolean
}) {
  return (
    <section aria-labelledby="overview-stats" className="grid gap-3">
      <div>
        <h2 id="overview-stats" className="text-base font-semibold">
          Overview stats
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Current membership and revenue snapshot.
        </p>
      </div>
      {hasActivity ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="min-h-36 rounded-lg border border-border bg-card p-3 text-card-foreground sm:p-4"
            >
              <div
                className={`mb-3 h-1.5 w-14 rounded-full ${
                  toneClasses[stat.tone]
                }`}
              />
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {stat.label}
              </p>
              <p className="mt-2 text-lg leading-7 font-semibold break-words sm:text-xl">
                {stat.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {stat.detail}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No dashboard activity yet."
          detail="Add members, memberships, or drop-ins to populate the overview."
          dashed
        />
      )}
    </section>
  )
}
