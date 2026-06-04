'use client'

import * as React from 'react'
import {
  Download, FileText, Plus, TrendingUp, Clock, Target,
  BookOpen, CheckCircle2, Flame, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { subDays, subMonths, subYears, parseISO, isAfter, format } from 'date-fns'
import { AddScoreDialog } from './add-score-dialog'
import { AccuracyTrends } from './accuracy-trends'
import { ScoreTrend } from './score-trend'
import { TopicMasteryHeatmap } from './topic-mastery-heatmap'
import { TopicMasteryTrends } from './topic-mastery-trends'
import { MistakeFrequency } from './mistake-frequency'
import { StudyTimeChart } from './study-time-chart'
import { ConsistencyChart } from './consistency-chart'
import { ReplanTimeline } from './replan-timeline'
import { WorkloadRedistribution } from './workload-redistribution'
import { AccuracyHeatmap } from './accuracy-heatmap'
import { useReplanLogs } from '@/hooks/use-replan-logs'
import { TopicMasteryCards } from '@/components/ai-coach/topic-mastery-cards'
import { PredictedScoreWidget } from '@/components/ai-coach/predicted-score-widget'
import type { ScoreHistory, QuestionSession, ReplanAuditLog } from '@/types'
import type { ErrorSummary } from './mistake-frequency'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataClientProps {
  scores:   ScoreHistory[]
  sessions: QuestionSession[]
  errors:   ErrorSummary[]
  replans:  ReplanAuditLog[]
  tasks: {
    id: string
    task_date: string
    duration_minutes: number | null
    subject: 'math' | 'reading_writing' | 'both'
    category: string | null
    is_completed: boolean
    replan_locked: boolean
  }[]
  profile: {
    target_score:         number | null
    current_score:        number | null
    test_date:            string | null
    daily_study_minutes:  number | null
  } | null
  mastery:     Record<string, unknown>[]
  predictions: Record<string, unknown>[]
}

type Preset = '7d' | '30d' | '90d' | '180d' | '1y' | 'all'

interface DateRange {
  from: Date | null
  to:   Date | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function presetRange(preset: Preset): DateRange {
  const now = new Date()
  if (preset === 'all') return { from: null, to: null }
  const map: Record<Preset, Date> = {
    '7d':  subDays(now, 7),
    '30d': subDays(now, 30),
    '90d': subDays(now, 90),
    '180d': subMonths(now, 6),
    '1y':  subYears(now, 1),
    'all': now,
  }
  return { from: map[preset], to: now }
}

function inRange(dateStr: string, range: DateRange): boolean {
  const d = parseISO(dateStr)
  if (range.from && !isAfter(d, subDays(range.from, 1))) return false
  if (range.to   && isAfter(d, range.to))               return false
  return true
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.FC<{ className?: string }>
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--muted)]">
        <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />
      </div>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--muted-foreground)]">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function sessionsToCSV(sessions: QuestionSession[]): string {
  const rows = [
    ['Date', 'Subject', 'Category', 'Subcategory', 'Attempted', 'Correct', 'Accuracy%', 'Minutes'],
    ...sessions.map(s => [
      s.session_date,
      s.subject,
      s.category,
      s.subcategory ?? '',
      s.questions_attempted ?? 0,
      s.questions_correct   ?? 0,
      s.questions_attempted
        ? Math.round(((s.questions_correct ?? 0) / s.questions_attempted) * 100)
        : 0,
      s.time_spent_minutes ?? 0,
    ]),
  ]
  return rows.map(r => r.join(',')).join('\n')
}

function scoresToCSV(scores: ScoreHistory[]): string {
  const rows = [
    ['Date', 'Type', 'Math', 'Reading&Writing', 'Total'],
    ...scores.map(s => [
      s.test_date,
      s.test_type,
      s.math_score              ?? '',
      s.reading_writing_score   ?? '',
      s.total_score             ?? '',
    ]),
  ]
  return rows.map(r => r.join(',')).join('\n')
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, iconBg, iconColor,
}: {
  icon: React.FC<{ className?: string }>
  label: string; value: string; sub?: string
  iconBg: string; iconColor: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg mb-3', iconBg)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs font-medium text-[var(--muted-foreground)] mt-1">{label}</p>
        {sub && <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Date preset pill ─────────────────────────────────────────────────────────

const PRESETS: { value: Preset; label: string }[] = [
  { value: '7d',   label: '7D'   },
  { value: '30d',  label: '30D'  },
  { value: '90d',  label: '90D'  },
  { value: '180d', label: '6M'   },
  { value: '1y',   label: '1Y'   },
  { value: 'all',  label: 'All'  },
]

// ─── Main component ───────────────────────────────────────────────────────────

export function DataClient({
  scores, sessions, errors, replans: initialReplans, tasks, profile, mastery, predictions,
}: DataClientProps) {
  const [preset,       setPreset]       = React.useState<Preset>('all')
  const [addScoreOpen, setAddScoreOpen] = React.useState(false)

  // useReplanLogs fetches replan_audit_logs directly from the browser Supabase
  // client on every mount, bypassing the Next.js client-side router cache.
  // Without this, new replan rows written during a session (createQuestionSession
  // → runAdaptiveReplanner) would not appear in the Replan History or Workload
  // Distribution charts until the user performed a hard page refresh.
  const { replans } = useReplanLogs(initialReplans)

  const range = presetRange(preset)

  // Filtered data
  const filteredSessions = preset === 'all'
    ? sessions
    : sessions.filter(s => inRange(s.session_date, range))

  const filteredErrors = preset === 'all'
    ? errors
    : errors.filter(e => inRange(e.created_at, range))

  const filteredReplans = preset === 'all'
    ? replans
    : replans.filter(r => inRange(r.created_at, range))

  const filteredScores = preset === 'all'
    ? scores
    : scores.filter(s => inRange(s.test_date, range))

  // KPI values
  const totalAttempted  = filteredSessions.reduce((s, q) => s + (q.questions_attempted ?? 0), 0)
  const totalCorrect    = filteredSessions.reduce((s, q) => s + (q.questions_correct   ?? 0), 0)
  const totalMinutes    = filteredSessions.reduce((s, q) => s + (q.time_spent_minutes   ?? 0), 0)
  const overallAcc      = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null
  const latestScore     = filteredScores.at(-1)?.total_score ?? scores.at(-1)?.total_score ?? null
  const unmasteredErrors = filteredErrors.filter(e => !e.mastered).length

  // Streak (always all-time, not filtered)
  const dayCounts: Record<string, number> = {}
  for (const s of sessions) {
    if (!s.session_date) continue
    const key = s.session_date.split('T')[0]
    dayCounts[key] = (dayCounts[key] ?? 0) + 1
  }
  let streak = 0
  let streakDay = new Date()
  for (;;) {
    const key = format(streakDay, 'yyyy-MM-dd')
    if (dayCounts[key]) { streak++; streakDay = new Date(streakDay.getTime() - 86400000) }
    else break
  }

  // Export handlers
  function handleExportCSV() {
    const ts = format(new Date(), 'yyyy-MM-dd')
    downloadCSV(sessionsToCSV(filteredSessions), `sat-sessions-${ts}.csv`)
    if (filteredScores.length > 0)
      setTimeout(() => downloadCSV(scoresToCSV(filteredScores), `sat-scores-${ts}.csv`), 200)
  }

  function handleExportPDF() {
    window.print()
  }

  const hours = Math.floor(totalMinutes / 60)
  const mins  = totalMinutes % 60

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Your SAT prep performance, habits, and planning insights
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExportCSV}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExportPDF}
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setAddScoreOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Log Score
          </Button>
        </div>
      </div>

      {/* ── Date range filter ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 no-print">
        <span className="text-xs text-[var(--muted-foreground)] mr-1 shrink-0">Period:</span>
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                preset === p.value
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset !== 'all' && (
          <span className="text-[11px] text-[var(--muted-foreground)] ml-2">
            {filteredSessions.length} sessions
          </span>
        )}
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={TrendingUp}
          label="Latest Score"
          value={latestScore ? latestScore.toString() : '—'}
          sub={profile?.target_score ? `Target: ${profile.target_score}` : 'out of 1600'}
          iconBg="bg-indigo-50 dark:bg-indigo-900/20"
          iconColor="text-indigo-600 dark:text-indigo-400"
        />
        <KpiCard
          icon={Target}
          label="Overall Accuracy"
          value={overallAcc !== null ? `${overallAcc}%` : '—'}
          sub={totalAttempted > 0 ? `${totalCorrect}/${totalAttempted} correct` : 'No sessions yet'}
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          icon={BookOpen}
          label="Questions"
          value={totalAttempted.toLocaleString()}
          sub={`${totalCorrect} correct`}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <KpiCard
          icon={Clock}
          label="Study Time"
          value={totalMinutes > 0 ? `${hours}h ${mins}m` : '0h'}
          sub={`${filteredSessions.length} sessions`}
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          iconColor="text-violet-600 dark:text-violet-400"
        />
        <KpiCard
          icon={Flame}
          label="Current Streak"
          value={streak > 0 ? `${streak}d` : '—'}
          sub={streak > 0 ? 'consecutive days' : 'Study today!'}
          iconBg="bg-orange-50 dark:bg-orange-900/20"
          iconColor="text-orange-600 dark:text-orange-400"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Open Errors"
          value={unmasteredErrors.toString()}
          sub={`${filteredErrors.filter(e => e.mastered).length} mastered`}
          iconBg="bg-rose-50 dark:bg-rose-900/20"
          iconColor="text-rose-600 dark:text-rose-400"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 1 — Performance                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={TrendingUp}
          title="Performance"
          subtitle="Score progression and accuracy trends over time"
        />
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AccuracyTrends sessions={filteredSessions} />
            <ScoreTrend scores={filteredScores} targetScore={profile?.target_score ?? null} />
          </div>
          <PredictedScoreWidget
            predictions={predictions as any}
            targetScore={profile?.target_score ?? null}
            currentScore={profile?.current_score ?? null}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 2 — Topic Analysis                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={BookOpen}
          title="Topic Analysis"
          subtitle="Mastery by domain, skill accuracy, and rankings"
        />
        <div className="space-y-4">
          {/* Full-width heatmap */}
          <TopicMasteryHeatmap sessions={filteredSessions} />

          {/* Two-col: trends + accuracy heatmap */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopicMasteryTrends sessions={filteredSessions} />
            <AccuracyHeatmap sessions={filteredSessions} />
          </div>

          {/* Domain mastery cards (8 domains, sorted weakest → strongest) */}
          <TopicMasteryCards mastery={mastery as any} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 3 — Mistakes                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={Target}
          title="Mistake Analysis"
          subtitle="Error type frequency and patterns in your error log"
        />
        <MistakeFrequency errors={filteredErrors} />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 4 — Study Habits                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={Calendar}
          title="Study Habits"
          subtitle="Time management, consistency, and follow-through"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StudyTimeChart sessions={filteredSessions} tasks={tasks} />
          <ConsistencyChart sessions={sessions} dateRange={range} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 5 — Planning Intelligence                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={TrendingUp}
          title="Planning Intelligence"
          subtitle="Adaptive replanner history and workload distribution"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ReplanTimeline replans={filteredReplans} />
          <WorkloadRedistribution replans={replans} />
        </div>
      </section>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <AddScoreDialog
        open={addScoreOpen}
        onOpenChange={setAddScoreOpen}
      />
    </div>
  )
}
