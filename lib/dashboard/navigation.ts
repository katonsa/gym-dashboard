import type { DashboardRouteHref } from "@/lib/application/dashboard-routes"

export const dashboardRoutes = [
  {
    href: "/",
    label: "Overview",
    description: "Daily alerts, revenue, and membership health.",
  },
  {
    href: "/members",
    label: "Members",
    description: "Search, filter, and inspect member billing status.",
  },
  {
    href: "/subscriptions",
    label: "Subscriptions",
    description: "Plan mix, tier revenue, and recurring revenue trends.",
  },
  {
    href: "/drop-ins",
    label: "Drop-ins",
    description: "Day-pass log, monthly totals, and conversion leads.",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Gym profile, operating defaults, and day-pass pricing.",
  },
] as const satisfies readonly {
  href: DashboardRouteHref
  label: string
  description: string
}[]

export type DashboardRoute = (typeof dashboardRoutes)[number]

export type DashboardNavigationModel = {
  primaryRoute: "/"
  secondaryViews: "separate-routes"
  routes: readonly DashboardRoute[]
}

export const dashboardNavigationModel: DashboardNavigationModel = {
  primaryRoute: "/",
  secondaryViews: "separate-routes",
  routes: dashboardRoutes,
}
