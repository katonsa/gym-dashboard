import { connection } from "next/server"

import { getSafeDashboardNextPath } from "@/lib/auth/next-path"
import { SignInForm } from "./sign-in-form"

type SignInPageProps = {
  searchParams: Promise<{
    next?: string | string[]
  }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  await connection()

  const { next } = await searchParams
  const nextPath = getSafeDashboardNextPath(next)
  const authPageState = await getAuthPageState()

  return (
    <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-sm flex-col justify-center">
      <p className="text-xs font-semibold text-primary uppercase">
        Owner access
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-normal">
        Sign in
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Enter the owner account provisioned for this gym.
      </p>

      {authPageState === "ready" ? (
        <SignInForm nextPath={nextPath} />
      ) : (
        <AuthFallbackState state={authPageState} />
      )}
    </div>
  )
}

async function getAuthPageState() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) {
    return "missing-config" as const
  }

  try {
    const { db } = await import("@/lib/db")
    await db.$queryRaw`SELECT 1`
    return "ready" as const
  } catch {
    return "database-unavailable" as const
  }
}

function AuthFallbackState({
  state,
}: {
  state: "missing-config" | "database-unavailable"
}) {
  const fallback =
    state === "missing-config"
      ? {
          title: "Auth configuration is missing.",
          detail:
            "Set DATABASE_URL and BETTER_AUTH_SECRET, then restart the app.",
        }
      : {
          title: "Database is unavailable.",
          detail: "Start Postgres and confirm DATABASE_URL, then retry.",
        }

  return (
    <div className="mt-6 rounded-lg border border-alert/35 bg-alert/10 p-4 text-alert">
      <h2 className="text-sm font-semibold">{fallback.title}</h2>
      <p className="mt-2 text-sm leading-6">{fallback.detail}</p>
    </div>
  )
}
