import { headers } from "next/headers"

import { getSessionFromHeaders } from "@/lib/auth/server"
import { csvResponse } from "@/lib/dashboard/csv"
import {
  getDropInExportFilename,
  getDropInVisitsCsv,
} from "@/lib/dashboard/export-csv"
import { db } from "@/lib/db"

export async function GET() {
  const gym = await getRouteGym()

  if (!gym) {
    return new Response("Unauthorized", { status: 401 })
  }

  return csvResponse(
    await getDropInVisitsCsv(gym, db),
    getDropInExportFilename()
  )
}

async function getRouteGym() {
  const session = await getSessionFromHeaders(await headers())

  if (!session) {
    return null
  }

  return db.gym.findFirst({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, timezone: true, currencyCode: true },
  })
}
