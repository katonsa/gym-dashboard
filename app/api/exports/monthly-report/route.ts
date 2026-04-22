import { headers } from "next/headers"
import type { NextRequest } from "next/server"

import { getSessionFromHeaders } from "@/lib/auth/server"
import { csvResponse } from "@/lib/dashboard/csv"
import {
  getMonthlyReportCsv,
  getMonthlyReportExportFilename,
  parseReportMonth,
} from "@/lib/dashboard/export-csv"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? ""
  const gym = await getRouteGym()

  if (!gym) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    parseReportMonth(month)
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Month must use YYYY-MM format.",
      { status: 400 }
    )
  }

  return csvResponse(
    await getMonthlyReportCsv({ gym, month, client: db }),
    getMonthlyReportExportFilename(month)
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
