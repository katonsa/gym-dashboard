export const dashboardRouteHrefs = [
  "/",
  "/members",
  "/subscriptions",
  "/drop-ins",
  "/settings",
] as const

export type DashboardRouteHref = (typeof dashboardRouteHrefs)[number]
