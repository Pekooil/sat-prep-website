import { BookOpen } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-4">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">SAT Study Planner AI</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Personalized SAT prep powered by AI
          </p>
        </div>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
