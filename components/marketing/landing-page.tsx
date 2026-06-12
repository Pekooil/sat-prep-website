'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarRange,
  ClipboardList,
  Gift,
  CheckCircle2,
  Loader2,
  NotebookPen,
  BookOpenCheck,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'
import { joinWaitlist } from '@/actions/waitlist'

/* ── Brand Saturn illustration (adapted from the auth panel for cohesion) ── */
function SaturnIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <defs>
        <clipPath id="lp-ring-back">
          <rect x="0" y="160" width="320" height="160" />
        </clipPath>
        <clipPath id="lp-ring-front">
          <rect x="0" y="0" width="320" height="160" />
        </clipPath>
        <filter id="lp-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse
        cx="160" cy="160" rx="148" ry="38"
        fill="none" stroke="currentColor" strokeWidth="22"
        clipPath="url(#lp-ring-back)" opacity="0.5"
      />
      <circle cx="160" cy="160" r="90" filter="url(#lp-glow)" />
      <ellipse cx="135" cy="135" rx="35" ry="22" fill="white" opacity="0.08" />
      <ellipse
        cx="160" cy="160" rx="148" ry="38"
        fill="none" stroke="currentColor" strokeWidth="22"
        clipPath="url(#lp-ring-front)" opacity="0.9"
      />
    </svg>
  )
}

/* ── Wishlist email capture — the only live interaction on the page ── */
const WaitlistForm = React.forwardRef<
  HTMLInputElement,
  { id: string; layout?: 'inline' | 'stacked' }
>(function WaitlistForm({ id, layout = 'inline' }, emailRef) {
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const result = await joinWaitlist(new FormData(e.currentTarget))
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div
        role="status"
        className="flex items-center gap-2.5 rounded-[var(--radius)] border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/60 dark:bg-emerald-900/20"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          You&apos;re on the list. We&apos;ll email you the moment we launch.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div
        className={
          layout === 'inline'
            ? 'flex flex-col gap-2.5 sm:flex-row sm:items-end'
            : 'flex flex-col gap-2.5'
        }
      >
        <div className="flex-1 space-y-1.5 text-left">
          <Label htmlFor={id} className="sr-only">
            Email address
          </Label>
          <Input
            ref={emailRef}
            id={id}
            name="email"
            type="email"
            inputSize="lg"
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="font-semibold sm:w-auto"
        >
          {pending ? (
            <>
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
              Joining…
            </>
          ) : (
            <>
              Join Wishlist
              <ArrowRight className="h-[18px] w-[18px]" />
            </>
          )}
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-left text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  )
})

/* ── Feature + step content ── */
const FEATURES = [
  {
    icon: CalendarRange,
    title: 'Adaptive planning',
    body: 'A study plan that reranks your weak domains as you practice and reshapes your day-by-day schedule automatically — so your time always goes where it moves the needle most.',
  },
  {
    icon: ClipboardList,
    title: 'Automated error log',
    body: 'Your mistakes are captured and turned into targeted review, so you stop missing the same things twice and watch your weak spots actually close.',
  },
  {
    icon: Gift,
    title: 'Completely free',
    body: 'Full access for everyone. No paywall, no tiers, no credit card. The whole planner is free, today and at launch.',
  },
] as const

const STEPS = [
  {
    icon: NotebookPen,
    title: 'Plan',
    body: 'Tell us your target score and test date. SaturnPath builds a personalized, day-by-day schedule around your weakest domains.',
  },
  {
    icon: BookOpenCheck,
    title: 'Practice',
    body: 'Each session points you to the official, free College Board Question Bank with the exact filters to drill — you practice right on their site.',
  },
  {
    icon: RefreshCw,
    title: 'Log & adapt',
    body: 'Log how you did. The plan re-prioritizes, your error log updates, and tomorrow’s schedule reshapes itself around what you just learned.',
  },
] as const

export function LandingPage() {
  const heroEmailRef = React.useRef<HTMLInputElement>(null)

  const focusWishlist = React.useCallback(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    heroEmailRef.current?.scrollIntoView({
      behavior: prefersReduced ? 'auto' : 'smooth',
      block: 'center',
    })
    // Defer focus until the smooth scroll settles so we don't fight it.
    window.setTimeout(() => heroEmailRef.current?.focus(), prefersReduced ? 0 : 320)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-body)]">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-base)_82%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <SaturnPathLogo size="md" asLink={false} />
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              size="sm"
              onClick={focusWishlist}
              className="font-semibold"
            >
              Join Wishlist
            </Button>
            <Link
              href="/login"
              className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Sign in for beta
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          {/* Quiet orbit texture + single restrained accent glow */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 top-[-12rem] h-[640px] w-[640px] -translate-x-1/2 rounded-full border border-[var(--border)]" />
            <div className="absolute left-1/2 top-[-9rem] h-[460px] w-[460px] -translate-x-1/2 rounded-full border border-[var(--border)]" />
            <div className="absolute left-1/2 top-[-6rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--accent)] opacity-[0.10] blur-[120px]" />
          </div>

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-28 lg:pt-24">
            {/* Left — copy + primary conversion */}
            <div className="max-w-xl">
              <span className="sp-eyebrow inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                Launching on 7/17/2026
              </span>
              <h1 className="sp-display mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
                Your personalized path to a higher SAT score.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-[var(--text-muted)]">
                SaturnPath is a data-driven SAT prep planner that learns your weak
                spots, schedules your practice day by day, and adapts the moment
                you log a result.
              </p>

              <div className="mt-8 max-w-md">
                <WaitlistForm id="hero-email" ref={heroEmailRef} />
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  Be first in line when we open. No spam — just one launch email.
                </p>
              </div>
            </div>

            {/* Right — brand visual */}
            <div className="flex justify-center lg:justify-end">
              <div className="text-[var(--accent)] opacity-90 dark:text-[var(--accent-hover)]">
                <SaturnIllustration className="h-56 w-56 sm:h-72 sm:w-72 lg:h-80 lg:w-80" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Core features ── */}
        <section className="border-t border-[var(--border)] bg-[var(--surface-base)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="max-w-2xl">
              <h2 className="sp-display text-3xl sm:text-4xl">
                Everything moves with you.
              </h2>
              <p className="mt-4 text-lg text-[var(--text-muted)]">
                Three things working together to make every study hour count.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-xs)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--accent-soft)]">
                    <Icon className="h-5 w-5 text-[var(--accent-soft-foreground)]" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-[var(--tracking-tight)] text-[var(--text-heading)]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="max-w-2xl">
              <span className="sp-eyebrow">How it works</span>
              <h2 className="sp-display mt-3 text-3xl sm:text-4xl">
                Plan, practice, adapt — on repeat.
              </h2>
              <p className="mt-4 text-lg text-[var(--text-muted)]">
                SaturnPath plans your prep and tracks your progress. You practice
                with the official, free College Board Question Bank — we never host
                or display any SAT questions.
              </p>
            </div>

            <ol className="mt-12 grid gap-5 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li
                  key={title}
                  className="relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-xs)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="sp-numeric text-sm font-semibold text-[var(--accent-soft-foreground)]">
                      0{i + 1}
                    </span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                    <Icon className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-[var(--tracking-tight)] text-[var(--text-heading)]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 lg:py-28">
            <div className="mx-auto mb-6 text-[var(--accent)] dark:text-[var(--accent-hover)]">
              <SaturnIllustration className="mx-auto h-20 w-20 opacity-90" />
            </div>
            <h2 className="sp-display text-3xl sm:text-4xl">
              Be first in line.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--text-muted)]">
              SaturnPath launches on 7/17/2026. Join the wishlist and we&apos;ll
              email you the moment it&apos;s ready.
            </p>
            <div className="mx-auto mt-8 max-w-md">
              <WaitlistForm id="cta-email" layout="inline" />
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Launching on 7/17/2026 — be first in line. No spam.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
          <SaturnPathLogo size="sm" asLink={false} />
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} SaturnPath. All rights reserved.
          </p>
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-[var(--radius-sm)]"
          >
            Sign in for beta
          </Link>
        </div>
      </footer>
    </div>
  )
}
