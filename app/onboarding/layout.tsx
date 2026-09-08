import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get Started — SaturnPath',
  description: 'Set up your personalized SAT study plan in minutes.',
  robots: { index: false, follow: false },
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-product-version="v2" className="min-h-screen bg-[var(--surface-base)] text-[var(--text-body)]">
      {children}
    </div>
  )
}
