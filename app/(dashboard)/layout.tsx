import { Dumbbell } from "lucide-react"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { AppShell } from "@/components/dashboard/app-shell"
import { ThemeToggle } from "@/components/theme-toggle"
import { requireDashboardSession } from "@/lib/auth/server"
import { getOwnerGym } from "@/lib/dashboard/owner-gym"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await requireDashboardSession()
  const gym = await getOwnerGym(session.user.id)

  if (!gym) {
    return <NoGymSetupState />
  }

  return <AppShell gymName={gym.name}>{children}</AppShell>
}

function NoGymSetupState() {
  return (
    <main className="min-h-svh bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-3xl flex-col">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                Gym dashboard
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Setup required
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <SignOutButton compact />
          </div>
        </header>

        <section className="flex flex-1 items-center py-12">
          <div className="w-full rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6">
            <p className="text-xs font-semibold text-primary uppercase">
              No gym found
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
              This owner account is not linked to a gym yet.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Ask an admin to create a gym for this account before using the
              dashboard.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
