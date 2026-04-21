import { db } from "@/lib/db"

export type AuthPageState =
  | "ready"
  | "setup-required"
  | "missing-config"
  | "database-unavailable"

export async function getAuthPageState(): Promise<AuthPageState> {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) {
    return "missing-config"
  }

  try {
    await db.$queryRaw`SELECT 1`
  } catch {
    return "database-unavailable"
  }

  const userCount = await db.user.count({ take: 1 })
  if (userCount === 0) {
    return "setup-required"
  }

  return "ready"
}

export function AuthFallbackState({
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
