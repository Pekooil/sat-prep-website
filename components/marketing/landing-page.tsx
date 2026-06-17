'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUp,
  BookOpenCheck,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Database,
  LineChart,
  NotebookPen,
  RefreshCw,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'
import type { LandingStats } from '@/actions/waitlist'
import { cn } from '@/lib/utils'

/* ════════════════════════════════════════════════════════════════════════
   Scroll-animation primitives
   ════════════════════════════════════════════════════════════════════════ */

/** Reveals children when they enter the viewport. Direction, stagger, and
    pace via props. Reduced motion / no-JS fall back to fully visible
    (see globals.css). */
function Reveal({
  children,
  variant = 'up',
  delay = 0,
  duration = 700,
  threshold = 0.15,
  className,
}: {
  children: React.ReactNode
  variant?: 'up' | 'left' | 'right' | 'scale'
  delay?: number
  duration?: number
  threshold?: number
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -48px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return (
    <div
      ref={ref}
      className={cn(
        'lp-reveal',
        variant === 'left' && 'lp-reveal-left',
        variant === 'right' && 'lp-reveal-right',
        variant === 'scale' && 'lp-reveal-scale',
        visible && 'lp-visible',
        className
      )}
      style={
        {
          '--lp-delay': `${delay}ms`,
          '--lp-duration': `${duration}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}

/** Word-by-word masked rise-in for the hero headline. Pure CSS animation, so
    it also runs without the IntersectionObservers; reduced motion falls back
    to plain visible text (globals.css). */
function WordsReveal({
  text,
  accentFrom,
  className,
}: {
  text: string
  accentFrom?: number
  className?: string
}) {
  const words = text.split(' ')
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="lp-word-mask">
          <span
            className={cn(
              'lp-word',
              accentFrom !== undefined && i >= accentFrom && 'text-[var(--accent)]'
            )}
            style={{ animationDelay: `${120 + i * 70}ms` }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </span>
  )
}

/** Animated integer count-up that starts when scrolled into view. */
function CountUp({
  value,
  suffix = '',
  duration = 1100,
}: {
  value: number
  suffix?: string
  duration?: number
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = React.useState(0)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setDisplay(value)
          return
        }
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setDisplay(Math.round(value * eased))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return (
    <span ref={ref} className="sp-numeric">
      {display.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   Brand Saturn illustration (adapted from the auth panel for cohesion)
   ────────────────────────────────────────────────────────────────────────
   The planet body stays still; only the RING turns. The ring is drawn as
   dashed ellipses (fine segments + one bright moon), and `stroke-dashoffset`
   — an inherited property — is animated on the wrapping <g>, so a single
   write spins every segment and the moon around the planet at once while the
   back/front clip halves preserve the "passes behind, then in front" depth.
   `ringRef` lets the page drive that offset from scroll; `ringIdle` opts into
   a slow ambient CSS spin (used on the closing CTA).
   ════════════════════════════════════════════════════════════════════════ */
function SaturnIllustration({
  className = '',
  ringRef,
  ringIdle = false,
}: {
  className?: string
  ringRef?: React.Ref<SVGGElement>
  ringIdle?: boolean
}) {
  const uid = React.useId().replace(/:/g, '')
  const back = `lpb-${uid}`
  const front = `lpf-${uid}`
  const glow = `lpg-${uid}`
  const pg = `lpPG-${uid}`
  const rg = `lpRG-${uid}`
  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={back}>
          <rect x="0" y="160" width="320" height="160" />
        </clipPath>
        <clipPath id={front}>
          <rect x="0" y="0" width="320" height="160" />
        </clipPath>
        <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={pg} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={rg} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
          <stop offset="35%" stopColor="#a855f7" />
          <stop offset="65%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Ring — static base band, back half */}
      <ellipse
        cx="160" cy="160" rx="148" ry="38"
        fill="none" stroke={`url(#${rg})`} strokeWidth="20"
        clipPath={`url(#${back})`} opacity="0.25"
      />

      {/* Planet body */}
      <circle cx="160" cy="160" r="88" fill={`url(#${pg})`} filter={`url(#${glow})`} />
      <ellipse cx="133" cy="132" rx="34" ry="22" fill="white" opacity="0.10" />
      <ellipse cx="188" cy="190" rx="40" ry="26" fill="black" opacity="0.10" />

      {/* Ring — static base band, front half */}
      <ellipse
        cx="160" cy="160" rx="148" ry="38"
        fill="none" stroke={`url(#${rg})`} strokeWidth="20"
        clipPath={`url(#${front})`} opacity="0.70"
      />

      {/* Turning ring detail — stroke-dashoffset inherited by all children */}
      <g ref={ringRef} className={ringIdle ? 'lp-ring-idle' : undefined}>
        {/* dashed ring segments — back half */}
        <ellipse
          cx="160" cy="160" rx="148" ry="38"
          fill="none" stroke={`url(#${rg})`} strokeWidth="20"
          strokeDasharray="3.5 23.03" clipPath={`url(#${back})`} opacity="0.28"
        />
        {/* moon dot — back (dim) */}
        <ellipse
          cx="160" cy="160" rx="148" ry="38"
          fill="none" stroke="#c084fc" strokeWidth="14" strokeLinecap="round"
          strokeDasharray="0.7 636" clipPath={`url(#${back})`} opacity="0.4"
        />
        {/* dashed ring segments — front half */}
        <ellipse
          cx="160" cy="160" rx="148" ry="38"
          fill="none" stroke={`url(#${rg})`} strokeWidth="20"
          strokeDasharray="3.5 23.03" clipPath={`url(#${front})`} opacity="0.6"
        />
        {/* moon dot — front (bright) */}
        <ellipse
          cx="160" cy="160" rx="148" ry="38"
          fill="none" stroke="#c084fc" strokeWidth="16" strokeLinecap="round"
          strokeDasharray="0.7 636" clipPath={`url(#${front})`} opacity="1"
        />
      </g>

      {/* Accent dots — logo.svg navigation markers on the upper ring arc */}
      <circle cx="87" cy="127" r="8" fill="#c084fc" opacity="0.85" />
      <circle cx="233" cy="127" r="8" fill="#c084fc" opacity="0.85" />

      {/* Star accents from logo.svg identity */}
      <circle cx="47" cy="93" r="7" fill="#a855f7" opacity="0.55" />
      <circle cx="267" cy="67" r="8" fill="#c084fc" opacity="0.50" />
      <circle cx="287" cy="213" r="5" fill="#a855f7" opacity="0.40" />
      <circle cx="33" cy="240" r="6" fill="#c084fc" opacity="0.40" />
    </svg>
  )
}

/** A station on the feature timeline. Lights up once it reaches the viewport
    center (rootMargin shrinks the root to a thin mid-screen band). Reduced
    motion / no-JS leave it in its quiet default state. */
function TimelineNode() {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [active, setActive] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: '-46% 0px -46% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn('lp-timeline-node', active && 'lp-active')}
    />
  )
}

/* ════════════════════════════════════════════════════════════════════════
   Product mocks — illustrative "screenshots" of the five headline features.
   Built in-code so they stay on-brand and copyright-safe: skeleton bars
   stand in for question content; only public CB domain/skill labels and
   the student's own A/B/C/D choices appear (per COPYRIGHT_COMPLIANCE.md).
   ════════════════════════════════════════════════════════════════════════ */

/** Browser-chrome frame that wraps each feature mock. */
function MockFrame({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <figure className={cn('m-0', className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none select-none overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface-raised)] shadow-[var(--shadow-xl)]"
      >
        <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          <span className="ml-2 truncate text-xs font-medium text-[var(--text-muted)]">
            {title}
          </span>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-[var(--text-muted)]">
        Illustrative preview — no SAT content is ever shown or stored.
      </figcaption>
    </figure>
  )
}

/** Gray skeleton line — stands in for content we never display. */
function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-2 rounded-full bg-[var(--surface-sunken)]', className)}
      style={{ backgroundColor: 'color-mix(in srgb, var(--text-muted) 18%, transparent)' }}
    />
  )
}

/* ── Mock 1 · Adaptive day-by-day planner ── */
function PlannerMock() {
  const days: {
    day: string
    blocks: { label: string; q: string; dot: string; moved?: boolean }[]
  }[] = [
    {
      day: 'Mon',
      blocks: [
        { label: 'Craft & Structure', q: '16q · Med', dot: 'var(--amber-500)' },
        { label: 'Algebra', q: '18q · Med', dot: 'var(--blue-500)' },
      ],
    },
    {
      day: 'Tue',
      blocks: [
        { label: 'Information & Ideas', q: '14q · Med', dot: 'var(--teal-500)' },
        { label: 'Advanced Math', q: '17q · Hard', dot: 'var(--indigo-500)' },
      ],
    },
    {
      day: 'Wed',
      blocks: [
        { label: 'Expression of Ideas', q: '15q · Med', dot: 'var(--rose-500)' },
        { label: 'Geometry & Trig', q: '20q · Easy', dot: 'var(--cyan-500)', moved: true },
      ],
    },
    {
      day: 'Thu',
      blocks: [
        { label: 'Craft & Structure', q: '16q · Med', dot: 'var(--amber-500)' },
        { label: 'Problem Solving', q: '12q · Med', dot: 'var(--green-500)' },
      ],
    },
    {
      day: 'Fri',
      blocks: [
        { label: 'Standard English', q: '14q · Hard', dot: 'var(--orange-500)' },
        { label: 'Algebra', q: '18q · Hard', dot: 'var(--blue-500)' },
      ],
    },
  ]

  return (
    <MockFrame title="SaturnPath — Calendar · Week 4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-heading)]">Your week, rebuilt around last night&apos;s session</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-soft-foreground)]">
          <RefreshCw className="h-3 w-3" />
          Replanned 2h ago
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {days.map(({ day, blocks }) => (
          <div key={day} className="space-y-2">
            <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {day}
            </p>
            {blocks.map((b) => (
              <div
                key={b.label + b.q}
                className={cn(
                  'rounded-[var(--radius-sm)] border px-2 py-2',
                  b.moved
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] bg-[var(--surface-base)]'
                )}
              >
                <span className="flex items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: b.dot }}
                  />
                  <span className="truncate text-[10px] font-semibold leading-tight text-[var(--text-heading)]">
                    {b.label}
                  </span>
                </span>
                <span className="mt-1 block text-[10px] text-[var(--text-muted)]">{b.q}</span>
                {b.moved && (
                  <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--accent-soft-foreground)]">
                    <ArrowUp className="h-2.5 w-2.5" />
                    Moved up
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-base)] px-3 py-2.5">
        <span className="lp-pulse h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
        <p className="text-xs text-[var(--text-body)]">
          <span className="font-semibold text-[var(--text-heading)]">Plan updated</span>
          {' '}— Geometry &amp; Trig accuracy dipped to 54%, so tomorrow starts there.
        </p>
      </div>
    </MockFrame>
  )
}

/* ── Mock 2 · Interactive session + pacing clock ── */
function SessionMock() {
  const choices = [
    { letter: 'A', selected: false },
    { letter: 'B', selected: true },
    { letter: 'C', selected: false },
    { letter: 'D', selected: false },
  ]
  return (
    <MockFrame title="SaturnPath — Practice Session · Math">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text-heading)]">Question 7 of 18</p>
            <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
              Advanced Math · Hard
            </span>
          </div>
          {/* The question itself lives on the College Board site — never here. */}
          <div className="mt-4 space-y-2.5">
            <SkeletonLine className="w-full" />
            <SkeletonLine className="w-11/12" />
            <SkeletonLine className="w-3/5" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {choices.map(({ letter, selected }) => (
              <div
                key={letter}
                className={cn(
                  'flex items-center gap-2.5 rounded-[var(--radius)] border px-3.5 py-2.5',
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] bg-[var(--surface-base)]'
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    selected
                      ? 'bg-[var(--accent)] text-white'
                      : 'border border-[var(--border-strong)] text-[var(--text-muted)]'
                  )}
                >
                  {letter}
                </span>
                {selected ? (
                  <Check className="h-4 w-4 text-[var(--accent-soft-foreground)]" />
                ) : (
                  <SkeletonLine className="w-12" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Adaptive pacing clock */}
        <div className="flex shrink-0 flex-col items-center gap-2 sm:w-40">
          <div className="relative h-28 w-28">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="color-mix(in srgb, var(--text-muted) 20%, transparent)"
                strokeWidth="7"
              />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="var(--accent)" strokeWidth="7" strokeLinecap="round"
                className="lp-clock-ring"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="sp-numeric text-xl font-semibold text-[var(--text-heading)]">
                17:25
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                remaining
              </span>
            </div>
          </div>
          <p className="text-center text-[11px] leading-snug text-[var(--text-muted)]">
            95s / question pacing —<br />real Digital SAT Math timing
          </p>
        </div>
      </div>
    </MockFrame>
  )
}

/* ── Mock 3 · Automated error log ── */
function ErrorLogMock() {
  const rows = [
    {
      domain: 'Craft and Structure',
      skill: 'Words in Context',
      type: 'Concept gap',
      typeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      session: 'Session 14',
      mastered: false,
    },
    {
      domain: 'Algebra',
      skill: 'Linear equations',
      type: 'Careless error',
      typeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
      session: 'Session 14',
      mastered: false,
    },
    {
      domain: 'Geometry & Trigonometry',
      skill: 'Circles',
      type: 'Timing issue',
      typeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      session: 'Session 13',
      mastered: false,
    },
    {
      domain: 'Information and Ideas',
      skill: 'Central Ideas',
      type: 'Mastered',
      typeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      session: 'Session 9',
      mastered: true,
    },
  ]
  return (
    <MockFrame title="SaturnPath — Error Log">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-heading)]">Error Log</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-soft-foreground)]">
          <span className="lp-pulse h-1.5 w-1.5 rounded-full bg-current" />
          3 captured from your last session
        </span>
      </div>
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
        {rows.map((r) => (
          <div
            key={r.domain + r.skill}
            className={cn(
              'flex items-center gap-3 bg-[var(--surface-base)] px-3.5 py-3',
              r.mastered && 'opacity-70'
            )}
          >
            {r.mastered ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-[var(--border-strong)]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--text-heading)]">
                {r.domain}
              </p>
              <p className="truncate text-[11px] text-[var(--text-muted)]">{r.skill}</p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                r.typeClass
              )}
            >
              {r.type}
            </span>
            <span className="hidden shrink-0 text-[11px] text-[var(--text-muted)] sm:block">
              {r.session}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Auto-recorded after every session — resurfaced in review sessions until you master it.
      </p>
    </MockFrame>
  )
}

/* ── Mock 4 · Score projection + weak-area analytics ── */
function AnalyticsMock() {
  const weak = [
    {
      domain: 'Geometry & Trigonometry',
      score: 38,
      tier: 'Needs Work',
      barClass: 'bg-rose-500',
      tierClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    },
    {
      domain: 'Advanced Math',
      score: 54,
      tier: 'Developing',
      barClass: 'bg-amber-500',
      tierClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
    {
      domain: 'Expression of Ideas',
      score: 63,
      tier: 'Developing',
      barClass: 'bg-amber-500',
      tierClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
  ]
  return (
    <MockFrame title="SaturnPath — Data · Score Projection">
      {/* Predicted score + projection toward target */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Predicted score
          </p>
          <div className="mt-1 flex items-end gap-2.5">
            <span className="sp-numeric text-4xl font-semibold leading-none text-[var(--text-heading)]">
              1340
            </span>
            <span className="mb-1 inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              +20
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Range 1290–1390 · based on 22 sessions
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Target className="h-3 w-3" />
            On pace for your 1400 target
          </span>
        </div>

        {/* Mini projection rising toward the dashed target line */}
        <div className="flex shrink-0 flex-col items-center gap-1.5 sm:w-40">
          <svg viewBox="0 0 150 84" className="h-20 w-full" aria-hidden="true">
            <line
              x1="0" y1="14" x2="150" y2="14"
              strokeWidth="1" strokeDasharray="4 4"
              className="stroke-emerald-500/70"
            />
            <polyline
              points="4,72 30,64 56,52 82,46 108,32 134,20"
              fill="none" stroke="var(--accent)" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            />
            <circle cx="134" cy="20" r="3.5" fill="var(--accent)" />
          </svg>
          <p className="text-center text-[10px] leading-snug text-[var(--text-muted)]">
            Projected toward<br />your 1400 target
          </p>
        </div>
      </div>

      {/* Weakest areas, surfaced first */}
      <div className="mt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--text-heading)]">
            Weakest areas — fix these first
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">8 domains tracked</span>
        </div>
        <div className="space-y-2.5">
          {weak.map(({ domain, score, tier, barClass, tierClass }) => (
            <div key={domain} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-[var(--text-heading)]">
                    {domain}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      tierClass
                    )}
                  >
                    {tier}
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--text-muted) 16%, transparent)' }}
                >
                  <div
                    className={cn('h-full rounded-full', barClass)}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
              <span className="sp-numeric w-9 shrink-0 text-right text-xs font-semibold text-[var(--text-heading)]">
                {score}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-base)] px-3 py-2.5">
        <LineChart className="h-4 w-4 shrink-0 text-[var(--accent-soft-foreground)]" />
        <p className="text-xs text-[var(--text-body)]">
          Recalculated after every session — your projection, pace, and weak-area ranking update the
          moment you log results.
        </p>
      </div>
    </MockFrame>
  )
}

/* ── Mock 5 · Question Bank coverage manager ── */
function BankMock() {
  const rows = [
    { domain: 'Algebra', done: 132, total: 154 },
    { domain: 'Craft and Structure', done: 96, total: 168 },
    { domain: 'Advanced Math', done: 71, total: 140 },
    { domain: 'Expression of Ideas', done: 44, total: 112 },
  ]
  return (
    <MockFrame title="SaturnPath — Question Bank Coverage">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-heading)]">
          College Board Question Bank
        </p>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          0 repeats
        </span>
      </div>
      <div className="space-y-3.5">
        {rows.map(({ domain, done, total }) => (
          <div key={domain}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-xs font-semibold text-[var(--text-heading)]">{domain}</span>
              <span className="sp-numeric text-[11px] text-[var(--text-muted)]">
                {done} / {total} practiced
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-muted) 16%, transparent)' }}
            >
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${Math.round((done / total) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-base)] px-3 py-2.5">
        <Database className="h-4 w-4 shrink-0 text-[var(--accent-soft-foreground)]" />
        <p className="text-xs text-[var(--text-body)]">
          Every assigned question is tracked — when a category runs low, fresh material is
          substituted automatically.
        </p>
      </div>
    </MockFrame>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   Content
   ════════════════════════════════════════════════════════════════════════ */

const SHOWCASE = [
  {
    icon: CalendarRange,
    eyebrow: 'Adaptive planner',
    title: 'A schedule that rebuilds itself around you.',
    body: 'The planner adjusts your day-by-day schedule from your actual performance. Every plan is customized to your scores, your test date, and your weak spots — no two students ever get the same schedule.',
    bullets: [
      'Re-ranks all 8 SAT domains after every session you log',
      'Tomorrow’s plan reshapes itself the moment your accuracy shifts',
      'Personal by construction — no two schedules are the same',
    ],
    Mock: PlannerMock,
  },
  {
    icon: Timer,
    eyebrow: 'Interactive sessions',
    title: 'Practice like it’s test day.',
    body: 'A clean, interactive interface makes answer entry effortless, while the adaptive pacing clock simulates the actual SAT time limit — so the real clock never surprises you.',
    bullets: [
      'One-tap A / B / C / D answer entry, zero friction',
      'Pacing clock tuned to real Digital SAT timing — 71s per R&W question, 95s per Math',
      'Overtime tracking shows exactly where the clock beats you',
    ],
    Mock: SessionMock,
  },
  {
    icon: ClipboardList,
    eyebrow: 'Automated error log',
    title: 'Every mistake, remembered for you.',
    body: 'An automated error log records every mistake from every session — tagged by domain, skill, and mistake type — and turns it into deep, targeted review so you never miss the same thing twice.',
    bullets: [
      'Mistakes captured automatically the moment a session ends',
      'Tagged as concept gap, careless error, timing issue, or strategy error',
      'Resurfaced in weekly review sessions until you mark them mastered',
    ],
    Mock: ErrorLogMock,
  },
  {
    icon: LineChart,
    eyebrow: 'Score analytics',
    title: 'Know your score before test day.',
    body: 'Every practice session feeds a live analytics page that re-projects your SAT score, complete with a confidence range. It confirms your pace is still on track for test day and surfaces the exact domains holding your score back — so you always know what to fix next.',
    bullets: [
      'Re-projects your SAT score after every session — with a range that tightens as you log more',
      'Confirms at a glance whether your pace still clears your target by test day',
      'Ranks all 8 domains weakest-first, so you always know what to fix next',
    ],
    Mock: AnalyticsMock,
  },
  {
    icon: Database,
    eyebrow: 'Question Bank manager',
    title: 'The whole Question Bank, perfectly managed.',
    body: 'SaturnPath manages the large official College Board Question Bank for you — tracking every category so all available questions get practiced and nothing you’ve already done is ever assigned again.',
    bullets: [
      'Tracks remaining questions across every domain, skill, and difficulty',
      'Never schedules a question you’ve already practiced — zero repeats',
      'Substitutes fresh categories automatically when one runs dry',
    ],
    Mock: BankMock,
  },
] as const

// STATS are built dynamically from server-fetched counts (see LandingPage props).

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

/* ════════════════════════════════════════════════════════════════════════
   Page
   ════════════════════════════════════════════════════════════════════════ */
export function LandingPage({ stats }: { stats: LandingStats }) {
  const STATS = [
    { value: stats.userCount,    suffix: '+', label: 'students already using SaturnPath' },
    { value: 3400,                suffix: '+', label: 'questions from College Board Question Bank' },
    { value: 29,                 suffix: '',  label: 'different skills for practice' },
    { value: 100,                suffix: '%', label: 'free — no paywall, no tiers' },
  ]

  const progressRef = React.useRef<HTMLDivElement>(null)
  const ringRef = React.useRef<SVGGElement>(null)
  const saturnParallaxRef = React.useRef<HTMLDivElement>(null)
  const scrollCueRef = React.useRef<HTMLDivElement>(null)
  const timelineRef = React.useRef<HTMLDivElement>(null)
  const spineFillRef = React.useRef<HTMLDivElement>(null)

  /* Scroll-linked motion, all via direct style writes (no re-renders):
       • header scroll-progress bar
       • the Saturn ring spinning (stroke-dashoffset) + a soft hero parallax
       • the feature timeline filling downward, led by the comet head
       • the hero scroll cue fading out
     With motion enabled we run one rAF loop (so the ring keeps a gentle
     ambient drift even when idle), paused while the tab is hidden. With
     reduced motion we only touch the scroll-linked bits, on scroll. */
  React.useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const writeScrollLinked = (y: number, max: number) => {
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`
      }
      if (timelineRef.current && spineFillRef.current) {
        const r = timelineRef.current.getBoundingClientRect()
        const p =
          r.height > 0
            ? Math.min(Math.max((window.innerHeight * 0.55 - r.top) / r.height, 0), 1)
            : 0
        spineFillRef.current.style.height = `${p * 100}%`
      }
      if (scrollCueRef.current) {
        scrollCueRef.current.style.opacity = `${Math.max(0, 1 - y / 280)}`
      }
    }

    if (prefersReduced) {
      let raf = 0
      const onScroll = () => {
        if (raf) return
        raf = requestAnimationFrame(() => {
          raf = 0
          writeScrollLinked(window.scrollY, document.documentElement.scrollHeight - window.innerHeight)
        })
      }
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll, { passive: true })
      return () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
        if (raf) cancelAnimationFrame(raf)
      }
    }

    let raf = 0
    let ambient = 0
    const frame = () => {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      writeScrollLinked(y, max)
      ambient += 0.3
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = `${-(y * 0.5 + ambient)}`
      }
      if (saturnParallaxRef.current) {
        saturnParallaxRef.current.style.transform = `translate3d(0, ${y * -0.05}px, 0)`
      }
      raf = requestAnimationFrame(frame)
    }
    const onVisibility = () => {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = 0 }
      } else if (!raf) {
        raf = requestAnimationFrame(frame)
      }
    }
    raf = requestAnimationFrame(frame)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-body)]">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-base)_82%,transparent)] backdrop-blur-md">
        {/* Scroll progress bar */}
        <div className="absolute inset-x-0 top-0 h-0.5" aria-hidden="true">
          <div
            ref={progressRef}
            className="h-full origin-left bg-[var(--accent)]"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <SaturnPathLogo size="md" asLink={false} />
          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild size="sm" className="font-semibold">
              <Link href="/signup">Get started free</Link>
            </Button>
            <Link
              href="/login"
              className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Sign in
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

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-20 lg:pt-24">
            {/* Left — copy + primary conversion */}
            <div className="max-w-xl">
              <Reveal>
                <span className="sp-eyebrow inline-flex items-center gap-2">
                  <span className="lp-pulse h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  100% free &middot; No paywall &middot; No tiers
                </span>
                <h1 className="sp-display mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
                  <WordsReveal text="SAT tutors charge $100/hr." className="whitespace-nowrap" />
                  <br />
                  <WordsReveal text="SaturnPath charges nothing." />
                </h1>
                <p className="mt-5 text-lg leading-relaxed text-[var(--text-muted)]">
                  SaturnPath is a data-driven SAT prep planner that learns your weak
                  spots, schedules your practice day by day, and adapts the moment
                  you log a result.
                </p>
              </Reveal>

              <Reveal delay={150}>
                <div className="mt-8 flex flex-wrap gap-3 items-center">
                  <div className="ai-planner-frame ai-planner-frame-sm inline-flex">
                    <div className="ai-planner-frame-inner bg-transparent">
                      <Button asChild size="lg" className="font-semibold bg-black text-white hover:bg-zinc-900">
                        <Link href="/signup">
                          Get started free
                          <ArrowRight className="h-[18px] w-[18px]" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </div>
              </Reveal>
            </div>

            {/* Right — brand visual: the ring spins as you scroll downward,
                while the planet stays put and the whole piece drifts gently. */}
            <div className="flex justify-center lg:justify-end">
              <Reveal variant="scale" delay={200}>
                <div
                  ref={saturnParallaxRef}
                  className="relative"
                  style={{ willChange: 'transform' }}
                >
                  {/* Ambient orbiting accent dots */}
                  <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <span className="lp-orbit lp-orbit-1">
                      <span className="lp-orbit-dot" />
                    </span>
                    <span className="lp-orbit lp-orbit-2">
                      <span className="lp-orbit-dot" />
                    </span>
                  </div>
                  <div className="lp-float opacity-95">
                    <SaturnIllustration
                      ringRef={ringRef}
                      className="h-56 w-56 sm:h-72 sm:w-72 lg:h-80 lg:w-80"
                    />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Scroll cue — fades out as the page moves */}
          <div
            ref={scrollCueRef}
            aria-hidden="true"
            className="relative z-10 mx-auto hidden w-fit flex-col items-center gap-1.5 pb-2 text-[var(--text-muted)] sm:flex"
          >
            <span className="text-[11px] font-medium uppercase tracking-[var(--tracking-wide)]">
              Scroll to explore
            </span>
            <ChevronDown className="lp-bounce h-4 w-4" />
          </div>

          {/* Stats strip */}
          <div className="relative mx-auto max-w-6xl px-5 pb-16 sm:px-8 lg:pb-20">
            <Reveal>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] shadow-[var(--shadow-xs)] lg:grid-cols-4">
                {STATS.map(({ value, suffix, label }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 bg-[var(--surface-raised)] px-6 py-5"
                  >
                    <dt className="order-2 text-sm text-[var(--text-muted)]">{label}</dt>
                    <dd className="order-1 text-3xl font-semibold tracking-[var(--tracking-tight)] text-[var(--text-heading)]">
                      <CountUp value={value} suffix={suffix} />
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        {/* ── Feature showcase ── */}
        <section id="features" className="border-t border-[var(--border)] bg-[var(--surface-base)] scroll-mt-16">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <Reveal className="max-w-2xl">
              <span className="sp-eyebrow">What&apos;s inside</span>
              <h2 className="sp-display mt-3 text-3xl sm:text-4xl">
                Everything moves with you.
              </h2>
              <p className="mt-4 text-lg text-[var(--text-muted)]">
                Five systems working together so every study hour lands exactly where
                it moves your score most.
              </p>
            </Reveal>

            <div
              ref={timelineRef}
              className="lp-timeline mt-16 space-y-24 lg:mt-20 lg:space-y-40"
            >
              {/* The central purple line: a track with a scroll-driven fill
                  and a glowing comet head leading the way down. */}
              <div className="lp-timeline-track" aria-hidden="true">
                <div ref={spineFillRef} className="lp-timeline-fill">
                  <span className="lp-timeline-comet" />
                </div>
              </div>

              {SHOWCASE.map(({ icon: Icon, eyebrow, title, body, bullets, Mock }, i) => {
                const flip = i % 2 === 1
                return (
                  <div
                    key={eyebrow}
                    className="relative grid items-center gap-10 pl-12 lg:grid-cols-2 lg:gap-16 lg:pl-0"
                  >
                    <TimelineNode />
                    <Reveal
                      variant={flip ? 'right' : 'left'}
                      duration={950}
                      className={flip ? 'lg:order-2' : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--accent-soft)]">
                          <Icon className="h-5 w-5 text-[var(--accent-soft-foreground)]" />
                        </div>
                        <span className="sp-eyebrow text-[var(--accent-soft-foreground)]">
                          0{i + 1} · {eyebrow}
                        </span>
                      </div>
                      <h3 className="sp-display mt-5 text-2xl sm:text-3xl">{title}</h3>
                      <p className="mt-4 text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
                        {body}
                      </p>
                      <ul className="mt-6 space-y-3">
                        {bullets.map((b, bi) => (
                          <li key={b}>
                            <Reveal variant="up" duration={650} delay={260 + bi * 110}>
                              <span className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-soft-foreground)]" />
                                <span className="text-sm leading-relaxed text-[var(--text-body)]">
                                  {b}
                                </span>
                              </span>
                            </Reveal>
                          </li>
                        ))}
                      </ul>
                    </Reveal>

                    <Reveal
                      variant={flip ? 'left' : 'right'}
                      delay={150}
                      duration={1000}
                      className={flip ? 'lg:order-1' : undefined}
                    >
                      <Mock />
                    </Reveal>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <Reveal className="max-w-2xl">
              <span className="sp-eyebrow">How it works</span>
              <h2 className="sp-display mt-3 text-3xl sm:text-4xl">
                Plan, practice, adapt — on repeat.
              </h2>
              <p className="mt-4 text-lg text-[var(--text-muted)]">
                SaturnPath plans your prep and tracks your progress. You practice
                with the official, free College Board Question Bank — we never host
                or display any SAT questions.
              </p>
            </Reveal>

            <ol className="mt-12 grid gap-5 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title}>
                  <Reveal delay={i * 130} className="h-full">
                    <div className="relative h-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-xs)]">
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
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 lg:py-28">
            <Reveal variant="scale">
              <div className="mx-auto mb-6">
                <SaturnIllustration ringIdle className="lp-float mx-auto h-20 w-20 opacity-90" />
              </div>
              <h2 className="sp-display text-3xl sm:text-4xl">
                Start studying smarter today.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--text-muted)]">
                SaturnPath is completely free — no paywall, no tiers. Create an account
                and get your personalized study plan in minutes.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <div className="mt-8 flex flex-wrap justify-center gap-3 items-center">
                <div className="ai-planner-frame ai-planner-frame-sm inline-flex">
                  <div className="ai-planner-frame-inner bg-transparent">
                    <Button asChild size="lg" className="font-semibold bg-black text-white hover:bg-zinc-900">
                      <Link href="/signup">
                        Get started free
                        <ArrowRight className="h-[18px] w-[18px]" />
                      </Link>
                    </Button>
                  </div>
                </div>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-10 sm:px-8">
          <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
            <SaturnPathLogo size="sm" asLink={false} />
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              <Link href="/privacy" className="font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-heading)]">
                Privacy Policy
              </Link>
              <Link href="/terms" className="font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-heading)]">
                Terms of Service
              </Link>
              <Link href="/login" className="font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-heading)]">
                Sign in
              </Link>
            </nav>
          </div>
          <div className="w-full space-y-1 border-t border-[var(--border)] pt-6 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              © {new Date().getFullYear()} SaturnPath. All rights reserved.
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              SAT is a trademark of the College Board, which is not affiliated with and does not
              endorse SaturnPath. SaturnPath is an independent study aid.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
