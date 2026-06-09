import { CheckCircle2 } from 'lucide-react'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'

const FEATURES = [
  'Adaptive study plans built around your weak spots',
  'College Board Question Bank filters for every session',
  'Real-time score prediction as you practice',
]

function SaturnIllustration() {
  return (
    <svg
      viewBox="0 0 320 320"
      className="w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 opacity-90"
      aria-hidden="true"
      fill="currentColor"
    >
      <defs>
        <clipPath id="auth-ring-back">
          <rect x="0" y="160" width="320" height="160" />
        </clipPath>
        <clipPath id="auth-ring-front">
          <rect x="0" y="0" width="320" height="160" />
        </clipPath>
        {/* Subtle glow filter */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ring — back half */}
      <ellipse
        cx="160" cy="160" rx="148" ry="38"
        fill="none" stroke="currentColor" strokeWidth="22"
        clipPath="url(#auth-ring-back)"
        opacity="0.55"
      />
      {/* Planet body */}
      <circle cx="160" cy="160" r="90" filter="url(#glow)" />
      {/* Subtle surface highlight */}
      <ellipse cx="135" cy="135" rx="35" ry="22" fill="white" opacity="0.08" />
      {/* Ring — front half */}
      <ellipse
        cx="160" cy="160" rx="148" ry="38"
        fill="none" stroke="currentColor" strokeWidth="22"
        clipPath="url(#auth-ring-front)"
        opacity="0.9"
      />
    </svg>
  )
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left brand panel (desktop only) — confident near-black, single accent ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 xl:p-16 bg-[#0a0a0a] overflow-hidden select-none">

        {/* Hairline orbit texture + one restrained accent glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/[0.05]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full border border-white/[0.05]" />
          <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-[var(--color-violet-500)] opacity-20 blur-[110px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          {/* Logo + wordmark */}
          <div className="mb-10">
            <SaturnPathLogo variant="dark" size="lg" asLink={false} pathColor="var(--color-violet-400)" />
          </div>

          {/* Saturn illustration */}
          <div className="text-white/85 mb-10">
            <SaturnIllustration />
          </div>

          {/* Headline */}
          <h1 className="text-3xl xl:text-4xl font-semibold text-white leading-tight tracking-[var(--tracking-tight)] mb-3">
            Your personalized path to a higher SAT score.
          </h1>
          <p className="text-white/55 text-sm leading-relaxed mb-8">
            Build a smart study plan in minutes. Track your progress. Reach your target.
          </p>

          {/* Feature list */}
          <ul className="space-y-3 text-left w-full">
            {FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white/75">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-violet-400)' }} />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 lg:w-1/2 flex flex-col items-center justify-center min-h-screen bg-[var(--surface-base)] p-6 sm:p-10">

        {/* Mobile-only compact header */}
        <div className="lg:hidden mb-8 self-start">
          <SaturnPathLogo size="sm" />
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>

    </div>
  )
}
