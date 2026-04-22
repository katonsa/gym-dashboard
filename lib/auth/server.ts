import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getDashboardSignInPath } from "@/lib/auth/next-path"
import { getSessionFromHeaders } from "@/lib/auth/session"
import type { DashboardRouteHref } from "@/lib/application/dashboard-routes"

export { getSessionFromHeaders }

export const getCurrentUserSession = cache(async () => {
  return getSessionFromHeaders(await headers())
})

export const requireDashboardSession = cache(
  async (nextPath: DashboardRouteHref = "/") => {
    const session = await getCurrentUserSession()

    if (!session) {
      redirect(getDashboardSignInPath(nextPath))
    }

    return session
  }
)
