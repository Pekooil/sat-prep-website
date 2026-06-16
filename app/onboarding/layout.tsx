import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get Started — SaturnPath',
  description: 'Set up your personalized SAT study plan in minutes.',
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-body)]">
      {children}
    </div>
  )
}
