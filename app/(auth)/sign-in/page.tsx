import type { Metadata } from "next"
import { connection } from "next/server"
import { redirect } from "next/navigation"

import { getSafeDashboardNextPath } from "@/lib/auth/next-path"
import { getCurrentUserSession } from "@/lib/auth/server"
import { getAuthPageState, AuthFallbackState } from "@/lib/auth/page-state"
import { SignInForm } from "./sign-in-form"
import { SetupWizard } from "./setup-wizard"

export const metadata: Metadata = {
  title: "Sign In",
}

type SignInPageProps = {
  searchParams: Promise<{
    next?: string | string[]
  }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  await connection()

  const { next } = await searchParams
  const nextPath = getSafeDashboardNextPath(next)
  const session = await getCurrentUserSession().catch(() => null)

  if (session) {
    redirect(nextPath)
  }

  const authPageState = await getAuthPageState()

  if (authPageState === "setup-required") {
    return (
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-sm flex-col justify-center">
        <p className="text-xs font-semibold text-primary uppercase">
          First-time setup
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">
          Create your gym
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Set up your owner account and gym to get started.
        </p>
        <SetupWizard />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-sm flex-col justify-center">
      <p className="text-xs font-semibold text-primary uppercase">
        Owner access
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-normal">Sign in</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Sign in to manage your gym.
      </p>

      {authPageState === "ready" ? (
        <SignInForm nextPath={nextPath} />
      ) : (
        <AuthFallbackState state={authPageState} />
      )}
    </div>
  )
}
