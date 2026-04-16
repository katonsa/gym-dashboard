import { dashboardRoutes } from "@/lib/dashboard"

const dashboardRouteHrefs = new Set<string>(
  dashboardRoutes.map((route) => route.href)
)

export function getSafeDashboardNextPath(
  next: string | string[] | undefined
) {
  const candidate = Array.isArray(next) ? next[0] : next

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/"
  }

  try {
    const parsed = new URL(candidate, "http://app.local")

    if (!dashboardRouteHrefs.has(parsed.pathname)) {
      return "/"
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return "/"
  }
}
