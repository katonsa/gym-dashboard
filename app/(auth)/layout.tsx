export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <main className="min-h-svh bg-background px-4 py-6 text-foreground">
      {children}
    </main>
  )
}
