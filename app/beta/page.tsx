import * as React from 'react'
import { Suspense } from 'react'
import { Lock } from 'lucide-react'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'
import { BetaGateForm } from './beta-gate-form'

function BetaGateCard() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <SaturnPathLogo size="md" asLink={false} />
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-raised)] p-8 shadow-[var(--shadow-xs)] space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--accent-soft)]">
              <Lock className="h-5 w-5 text-[var(--accent-soft-foreground)]" />
            </div>
            <div>
              <h1 className="sp-display text-xl">Beta access</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                SaturnPath is in closed beta. Enter your access code to continue.
              </p>
            </div>
          </div>

          {/* useSearchParams() must be inside Suspense in the App Router */}
          <Suspense fallback={<div className="h-24" />}>
            <BetaGateForm />
          </Suspense>
        </div>

        <p className="text-center text-sm text-[var(--text-muted)]">
          Not a beta tester?{' '}
          <a
            href="/"
            className="font-medium text-[var(--accent-soft-foreground)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-sm"
          >
            Join the wishlist
          </a>
        </p>
      </div>
    </div>
  )
}

export default function BetaGatePage() {
  return <BetaGateCard />
}
