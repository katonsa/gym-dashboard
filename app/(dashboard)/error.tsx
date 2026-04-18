"use client"

import { DashboardErrorState } from "@/components/dashboard/dashboard-error-state"

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <DashboardErrorState error={error} unstable_retry={unstable_retry} />
}
