"use client"

import { AuthErrorState } from "@/components/auth/auth-error-state"

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <AuthErrorState error={error} unstable_retry={unstable_retry} />
}
