'use client'

import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { DOMAIN_CATALOG } from '@/lib/study-plan-engine/domain-catalog'

interface MasteryRow {
  domain_key: string
  domain_label: string
  subject: 'math' | 'reading_writing'
  mastery_score: number
  accuracy_score: number | null
  recent_accuracy: number | null
  improvement_factor: number | null
  total_questions_attempted: number
  total_sessions: number
  computed_at: string
}

interface TopicMasteryCardsProps {
  mastery: MasteryRow[]
}

type MasteryLevel = 'mastered' | 'proficient' | 'developing' | 'needs_work'

function levelForScore(score: number): MasteryLevel {
  if (score >= 90) return 'mastered'
  if (score >= 70) return 'proficient'
  if (score >= 50) return 'developing'
  return 'needs_work'
}

const LEVEL_CONFIG: Record<MasteryLevel, {
  label: string
  badgeClass: string
  barClass: string
  borderClass: string
  bgClass: string
}> = {
  mastered:   {
    label:       'Mastered',
    badgeClass:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    barClass:    '[&>div]:bg-emerald-500',
    borderClass: 'border-[var(--border)]',
    bgClass:     'bg-[var(--surface-raised)]',
  },
  proficient: {
    label:       'Proficient',
    badgeClass:  'bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]',
    barClass:    '[&>div]:bg-[var(--accent)]',
    borderClass: 'border-[var(--border)]',
    bgClass:     'bg-[var(--surface-raised)]',
  },
  developing: {
    label:       'Developing',
    badgeClass:  'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    barClass:    '[&>div]:bg-amber-500',
    borderClass: 'border-[var(--border)]',
    bgClass:     'bg-[var(--surface-raised)]',
  },
  needs_work: {
    label:       'Needs Work',
    badgeClass:  'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    barClass:    '[&>div]:bg-rose-500',
    borderClass: 'border-[var(--border)]',
    bgClass:     'bg-[var(--surface-raised)]',
  },
}

function subjectLabel(subject: string) {
  return subject === 'math' ? 'Math' : 'Reading & Writing'
}

export function TopicMasteryCards({ mastery }: TopicMasteryCardsProps) {
  // Build a map of existing mastery data, default missing domains to score 50
  const masteryByKey = new Map(mastery.map(m => [m.domain_key, m]))

  const allDomains = DOMAIN_CATALOG.map(domain => {
    const m = masteryByKey.get(domain.key)
    return {
      key:        domain.key,
      label:      domain.label,
      subject:    domain.subject,
      score:      m?.mastery_score ?? 50,
      accuracy:   m?.accuracy_score ?? 50,
      recent:     m?.recent_accuracy ?? null,
      sessions:   m?.total_sessions ?? 0,
      questions:  m?.total_questions_attempted ?? 0,
      hasData:    !!m,
    }
  })

  // Sort weakest first (intervention items appear at top)
  const sorted = [...allDomains].sort((a, b) => a.score - b.score)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          Sorted weakest → strongest. Scores update after each study session.
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {mastery.length} of 8 domains tracked
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {sorted.map(d => {
          const level  = levelForScore(d.score)
          const cfg    = LEVEL_CONFIG[level]
          const improvement = d.recent !== null
            ? Math.round(d.recent - d.accuracy)
            : null

          return (
            <div
              key={d.key}
              className={cn(
                'rounded-[var(--radius-lg)] border p-4 space-y-3 shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-sm)]',
                cfg.borderClass,
                cfg.bgClass,
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold leading-tight">{d.label}</p>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                    {subjectLabel(d.subject)}
                  </p>
                </div>
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0', cfg.badgeClass)}>
                  {cfg.label}
                </span>
              </div>

              {/* Mastery score */}
              <div>
                <div className="flex items-end justify-between mb-1">
                  <span className="text-2xl font-semibold leading-none font-mono tabular-nums text-[var(--text-heading)]">{d.score}</span>
                  <span className="text-[11px] text-[var(--muted-foreground)]">/100</span>
                </div>
                <Progress
                  value={d.score}
                  className={cn('h-2', cfg.barClass)}
                />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-1 text-center">
                <Stat label="Accuracy" value={d.accuracy ? `${Math.round(d.accuracy)}%` : '—'} />
                <Stat
                  label="Recent"
                  value={d.recent !== null ? `${Math.round(d.recent)}%` : '—'}
                  delta={improvement}
                />
                <Stat label="Sessions" value={d.sessions > 0 ? d.sessions.toString() : '—'} />
              </div>

              {/* No data note */}
              {!d.hasData && (
                <p className="text-[10px] text-[var(--muted-foreground)] italic">
                  No sessions yet — defaults to 50
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-medium leading-none">{value}</p>
      {delta !== null && delta !== undefined && (
        <p className={cn(
          'text-[9px] font-medium leading-none mt-0.5',
          delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]',
        )}>
          {delta > 0 ? `+${delta}` : delta}
        </p>
      )}
      <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5">{label}</p>
    </div>
  )
}
