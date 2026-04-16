import { NextResponse, type NextRequest } from "next/server"

import { getDashboardSignInPath } from "@/lib/auth/next-path"
import { getSessionFromHeaders } from "@/lib/auth/session"

export async function proxy(request: NextRequest) {
  const session = await getSessionFromHeaders(request.headers).catch(() => null)

  if (session) {
    return NextResponse.next()
  }

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`

  return NextResponse.redirect(
    new URL(getDashboardSignInPath(nextPath), request.url)
  )
}

export const config = {
  matcher: ["/", "/members", "/subscriptions", "/drop-ins"],
}
