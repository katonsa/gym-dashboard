"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BadgeDollarSign,
  CircleDollarSign,
  Dumbbell,
  Users,
} from "lucide-react"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { dashboardRoutes, type DashboardRouteHref } from "@/lib/dashboard"
import { cn } from "@/lib/utils"

const routeIcons: Record<
  DashboardRouteHref,
  React.ComponentType<{ className?: string }>
> = {
  "/": Dumbbell,
  "/members": Users,
  "/subscriptions": CircleDollarSign,
  "/drop-ins": BadgeDollarSign,
}

export function AppShell({
  children,
  gymName,
}: {
  children: React.ReactNode
  gymName: string
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="flex min-h-svh">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground lg:flex lg:flex-col">
          <div className="mb-7 px-2">
            <Link href="/" className="flex min-h-11 items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Dumbbell className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-normal">
                  {gymName}
                </span>
                <span className="block truncate text-xs text-sidebar-foreground/60">
                  Daily operations
                </span>
              </span>
            </Link>
          </div>

          <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
            {dashboardRoutes.map((route) => (
              <NavItem
                key={route.href}
                href={route.href}
                label={route.label}
                active={pathname === route.href}
                desktop
              />
            ))}
          </nav>

          <div className="grid gap-2 border-t border-sidebar-border pt-4">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-3 lg:hidden"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Dumbbell className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {gymName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    Daily operations
                  </span>
                </span>
              </Link>

              <div className="hidden min-w-0 lg:block">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Gym dashboard
                </p>
                <p className="truncate text-sm text-foreground/85">
                  Membership, revenue, and drop-in control room
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <SignOutButton compact />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 lg:px-8 lg:pt-7 lg:pb-10">
            {children}
          </main>
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-4 gap-1">
          {dashboardRoutes.map((route) => (
            <NavItem
              key={route.href}
              href={route.href}
              label={route.label}
              active={pathname === route.href}
            />
          ))}
        </div>
      </nav>
    </div>
  )
}

function NavItem({
  href,
  label,
  active,
  desktop = false,
}: {
  href: DashboardRouteHref
  label: string
  active: boolean
  desktop?: boolean
}) {
  const Icon = routeIcons[href]

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-14 items-center justify-center rounded-lg border border-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active &&
          "border-primary/30 bg-primary/12 text-foreground shadow-[inset_0_1px_0_var(--color-shell-highlight)]",
        desktop &&
          "min-h-11 justify-start gap-3 px-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        desktop &&
          active &&
          "bg-sidebar-primary text-sidebar-primary-foreground"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          !desktop && "mb-1 block size-5",
          active && "text-primary",
          desktop && active && "text-sidebar-primary-foreground"
        )}
      />
      <span className={cn(!desktop && "block leading-tight")}>{label}</span>
    </Link>
  )
}
