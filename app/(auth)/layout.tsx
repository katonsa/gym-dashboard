import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <main className="min-h-svh bg-background px-4 py-6 text-foreground">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle compact />
      </div>
      {children}
    </main>
  )
}
