import type { Metadata } from 'next'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'

export const metadata: Metadata = {
  title: 'Get Started — SaturnPath',
  description: 'Set up your personalized SAT study plan in minutes.',
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4">
      {/* Single restrained accent glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 -top-32 -translate-x-1/2 h-80 w-80 rounded-full bg-[var(--accent)] opacity-[0.07] blur-[120px]" />
      </div>

      {/* Logo header */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
        <SaturnPathLogo size="sm" />
        <span className="text-xs text-[var(--text-muted)]">Setup Wizard</span>
      </div>

      {/* Wizard card */}
      <div className="relative z-10 w-full max-w-2xl mt-16">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)] overflow-hidden">
          {children}
        </div>
        <p className="text-center text-xs text-[var(--text-muted)] mt-4">
          Your data is private and protected. No SAT questions are stored.
        </p>
      </div>
    </div>
  )
}
