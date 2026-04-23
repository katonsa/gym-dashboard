export const dashboardRouteHrefs = [
  "/",
  "/account",
  "/members",
  "/subscriptions",
  "/drop-ins",
  "/settings",
] as const

export type DashboardRouteHref = (typeof dashboardRouteHrefs)[number]
