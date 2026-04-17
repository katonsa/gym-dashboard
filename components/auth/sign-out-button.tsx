"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"
import { cn } from "@/lib/utils"

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = React.useState(false)
  const label = isSigningOut ? "Signing out" : "Sign out"

  async function handleSignOut() {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.replace("/sign-in")
            router.refresh()
          },
          onError: () => {
            setIsSigningOut(false)
          },
        },
      })
    } catch {
      setIsSigningOut(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon-lg" : "lg"}
      aria-label={label}
      disabled={isSigningOut}
      className={cn(
        "min-h-11 border-border bg-background/70",
        compact && "min-w-11",
        !compact && "w-full justify-start gap-2"
      )}
      onClick={() => {
        void handleSignOut()
      }}
    >
      <LogOut className="size-4" />
      {!compact ? <span>{label}</span> : null}
    </Button>
  )
}
