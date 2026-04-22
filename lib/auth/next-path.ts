import { dashboardRouteHrefs } from "@/lib/application/dashboard-routes"

const safeDashboardRouteHrefs = new Set<string>(dashboardRouteHrefs)

export function getSafeDashboardNextPath(next: string | string[] | undefined) {
  const candidate = Array.isArray(next) ? next[0] : next

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/"
  }

  try {
    const parsed = new URL(candidate, "http://app.local")

    if (!safeDashboardRouteHrefs.has(parsed.pathname)) {
      return "/"
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return "/"
  }
}

export function getDashboardSignInPath(next: string | string[] | undefined) {
  const nextPath = getSafeDashboardNextPath(next)

  return `/sign-in?next=${encodeURIComponent(nextPath)}`
}
