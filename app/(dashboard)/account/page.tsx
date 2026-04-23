import type { Metadata } from "next"

import { requireDashboardSession } from "@/lib/auth/server"
import { EmailForm } from "./email-form"
import { PasswordForm } from "./password-form"

export const metadata: Metadata = {
  title: "Account",
}

export default async function AccountPage() {
  const session = await requireDashboardSession("/account")

  return (
    <div className="grid gap-5 lg:gap-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary uppercase">
            Personal settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-balance sm:text-3xl">
            Account
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage your personal sign-in email and password separately from gym
            administration.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Current email
          </p>
          <p className="mt-1 truncate text-sm font-semibold sm:text-base">
            {session.user.email}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Used for dashboard sign-in
          </p>
        </div>
      </section>

      <EmailForm currentEmail={session.user.email} />
      <PasswordForm currentEmail={session.user.email} />
    </div>
  )
}
