import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get Started — SAT Study Planner AI',
  description: 'Set up your personalized SAT study plan in minutes.',
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-4">
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-violet-400/5 blur-2xl" />
      </div>

      {/* Logo header */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <span className="font-bold text-sm text-[var(--foreground)]">SAT Study Planner AI</span>
        </div>
        <span className="text-xs text-slate-400">Setup Wizard</span>
      </div>

      {/* Wizard card */}
      <div className="relative z-10 w-full max-w-2xl mt-16">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl shadow-slate-900/10 overflow-hidden">
          {children}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          Your data is private and protected. No SAT questions are stored.
        </p>
      </div>
    </div>
  )
}
