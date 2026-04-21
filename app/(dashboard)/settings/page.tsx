import { EmptyState } from "@/components/dashboard/empty-state"
import { requireDashboardSession } from "@/lib/auth/server"
import { getOwnerGym } from "@/lib/dashboard/owner-gym"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const session = await requireDashboardSession("/settings")
  const gym = await getOwnerGym(session.user.id)

  if (!gym) {
    return (
      <EmptyState
        title="No gym is connected to this owner account."
        detail="Create or assign a gym before settings can be changed."
      />
    )
  }

  const moneyFormatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: gym.currencyCode,
    maximumFractionDigits: 0,
  })

  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            Owner settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
            Gym settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Control the name, local operating timezone, currency, and default
            day-pass price used across the dashboard.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Current drop-in
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {moneyFormatter.format(gym.defaultDropInFeeAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Applied to new drop-in entries
          </p>
        </div>
      </section>

      <SettingsForm gym={gym} />
    </div>
  )
}
