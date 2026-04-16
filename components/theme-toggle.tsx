"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme !== "light"
  const label = mounted
    ? isDark
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle theme"

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon-lg" : "lg"}
      aria-label={label}
      className={cn(
        "min-h-11 border-border bg-background/70",
        compact && "min-w-11",
        !compact && "w-full justify-start gap-2"
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? <Sun className="size-4" /> : null}
      {mounted && !isDark ? <Moon className="size-4" /> : null}
      {!mounted ? <span className="size-4" aria-hidden="true" /> : null}
      {!compact ? (
        <span>{mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}</span>
      ) : null}
    </Button>
  )
}
