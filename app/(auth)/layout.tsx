export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-4">
      <div className="mb-8 flex flex-col items-center gap-3">
        <img src="/logo.svg" alt="SaturnPath logo" className="h-12 w-12" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">SaturnPath</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Personalized SAT prep powered by AI
          </p>
        </div>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
