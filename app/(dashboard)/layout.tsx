import { Suspense } from "react"

import { AppShell } from "@/components/dashboard/app-shell"
import { DashboardShellFallback } from "@/components/dashboard/dashboard-shell-fallback"
import { GymSetupShell } from "@/components/dashboard/gym-setup-shell"
import { requireDashboardSession } from "@/lib/auth/server"
import { getOwnerGym } from "@/lib/gyms/owner-gym"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<DashboardShellFallback />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}

async function DashboardLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await requireDashboardSession()
  const gym = await getOwnerGym(session.user.id)

  if (!gym) {
    return <GymSetupShell />
  }

  return <AppShell gymName={gym.name}>{children}</AppShell>
}
