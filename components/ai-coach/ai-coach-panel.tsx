'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, AlertTriangle, Bot, BarChart3, History, GitBranch, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { triggerManualReplan, recoverMissedAndReplan } from '@/actions/adaptive-replanner'
import { TopicMasteryCards } from './topic-mastery-cards'
import { PredictedScoreWidget } from './predicted-score-widget'
import { AIRecommendations } from './ai-recommendations'
import { PlanVersionHistory } from './plan-version-history'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  current_score: number | null
  target_score: number | null
  test_date: string | null
  daily_study_minutes: number | null
}

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

interface PredictionRow {
  id: string
  predicted_score: number
  confidence_low: number
  confidence_high: number
  baseline_score: number | null
  consistency_factor: number | null
  session_count: number | null
  created_at: string
}

type RecommendationType =
  | 'increase_volume' | 'reduce_volume' | 'intervention'
  | 'maintenance' | 'schedule_change' | 'recovery' | 'general'

interface RecommendationRow {
  id: string
  domain_key: string | null
  domain_label: string | null
  recommendation_type: RecommendationType
  message: string
  old_mastery: number | null
  new_mastery: number | null
  is_read: boolean
  created_at: string
}

interface VersionRow {
  id: string
  version_number: number
  triggered_by: string
  reason: string | null
  tasks_updated: number
  predicted_score: number | null
  created_at: string
}

interface AiCoachPanelProps {
  profile: Profile | null
  mastery: MasteryRow[]
  predictions: PredictionRow[]
  recommendations: RecommendationRow[]
  versions: VersionRow[]
  overdueCount: number
}

// ─── Mastery summary helpers ──────────────────────────────────────────────────

function masteryStats(mastery: MasteryRow[]) {
  if (mastery.length === 0) return null
  const sorted = [...mastery].sort((a, b) => a.mastery_score - b.mastery_score)
  const avgScore = Math.round(mastery.reduce((s, m) => s + m.mastery_score, 0) / mastery.length)
  const weakest  = sorted.slice(0, 3)
  const strongest = sorted.slice(-3).reverse()
  const interventions = mastery.filter(m => m.mastery_score < 50)
  return { avgScore, weakest, strongest, interventions }
}

// ─── Overview cards ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">{label}</p>
        <p className={cn('text-2xl font-bold mt-1 font-mono tabular-nums', color)}>{value}</p>
        {sub && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.FC<{ className?: string }>; title: string; subtitle?: string
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

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AiCoachPanel({
  profile,
  mastery,
  predictions,
  recommendations,
  versions,
  overdueCount,
}: AiCoachPanelProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isReplanning,  setIsReplanning]  = React.useState(false)
  const [isRecovering,  setIsRecovering]  = React.useState(false)

  const stats      = masteryStats(mastery)
  const latestPred = predictions[0]
  const unreadCount = recommendations.filter(r => !r.is_read).length

  async function handleReplanNow() {
    setIsReplanning(true)
    try {
      const result = await triggerManualReplan()
      if (result.error) {
        toast({ title: 'Replan failed', description: result.error, variant: 'destructive' })
      } else {
        toast({
          title: 'Plan updated',
          description: `${result.tasksUpdated} tasks updated. Predicted score: ${result.predictedScore}.`,
        })
        router.refresh()
      }
    } finally {
      setIsReplanning(false)
    }
  }

  async function handleRecoverMissed() {
    setIsRecovering(true)
    try {
      const result = await recoverMissedAndReplan()
      if (result.error) {
        toast({ title: 'Recovery failed', description: result.error, variant: 'destructive' })
      } else {
        toast({
          title: 'Missed tasks recovered',
          description: `${result.recovered} tasks rescheduled, ${result.tasksUpdated} future tasks updated.`,
        })
        router.refresh()
      }
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-violet-600" />
            AI Coach
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Adaptive plan intelligence — updates automatically as you study
          </p>
        </div>

        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400"
              onClick={handleRecoverMissed}
              disabled={isRecovering}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {isRecovering ? 'Recovering…' : `Recover ${overdueCount} Missed`}
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleReplanNow}
            disabled={isReplanning}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isReplanning && 'animate-spin')} />
            {isReplanning ? 'Replanning…' : 'Replan Now'}
          </Button>
        </div>
      </div>

      {/* ── Overview KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Avg Mastery"
          value={stats ? `${stats.avgScore}/100` : '—'}
          sub={mastery.length > 0 ? `${mastery.length} domains tracked` : 'No sessions yet'}
          color={stats && stats.avgScore >= 70 ? 'text-emerald-600' : stats && stats.avgScore >= 50 ? 'text-amber-600' : 'text-rose-600'}
        />
        <StatCard
          label="Predicted Score"
          value={latestPred ? latestPred.predicted_score.toString() : '—'}
          sub={latestPred ? `${latestPred.confidence_low}–${latestPred.confidence_high}` : undefined}
          color="text-violet-600"
        />
        <StatCard
          label="Interventions"
          value={stats ? stats.interventions.length.toString() : '—'}
          sub="Domains below 50"
          color={stats && stats.interventions.length > 0 ? 'text-rose-600' : 'text-emerald-600'}
        />
        <StatCard
          label="Plan Versions"
          value={versions.length.toString()}
          sub={versions[0] ? `Latest: v${versions[0].version_number}` : 'No versions yet'}
          color="text-[var(--foreground)]"
        />
      </div>

      {/* ── AI Recommendations (always visible) ─────────────────────────────── */}
      {(recommendations.length > 0 || unreadCount > 0) && (
        <section>
          <SectionHeader
            icon={Bot}
            title="AI Coach Insights"
            subtitle={unreadCount > 0 ? `${unreadCount} new insight${unreadCount !== 1 ? 's' : ''}` : 'Your personalized coaching messages'}
          />
          <AIRecommendations recommendations={recommendations} />
        </section>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="topics">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="topics" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Topics
          </TabsTrigger>
          <TabsTrigger value="score" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Score Trend
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 relative">
            <GitBranch className="h-3.5 w-3.5" />
            Plan History
            {versions.length > 0 && (
              <span className="ml-1 rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-medium">
                {versions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Topics tab ──────────────────────────────────────────────────── */}
        <TabsContent value="topics" className="mt-4">
          <section>
            <SectionHeader
              icon={BarChart3}
              title="Topic Mastery"
              subtitle="6-factor mastery score per domain (accuracy, recency, improvement, mistakes, confidence, consistency)"
            />

            {/* Weakest / Strongest quick summary */}
            {stats && mastery.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
                <div className="rounded-xl border border-rose-200 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20 p-4">
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wide mb-2">
                    Focus Areas (Weakest)
                  </p>
                  <div className="space-y-1">
                    {stats.weakest.map(m => (
                      <div key={m.domain_key} className="flex items-center justify-between text-sm">
                        <span>{m.domain_label}</span>
                        <span className="font-bold text-rose-700 dark:text-rose-400">{m.mastery_score}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20 p-4">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">
                    Strongest Topics
                  </p>
                  <div className="space-y-1">
                    {stats.strongest.map(m => (
                      <div key={m.domain_key} className="flex items-center justify-between text-sm">
                        <span>{m.domain_label}</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{m.mastery_score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mastery heatmap row */}
            {mastery.length > 0 && (
              <div className="mb-4">
                <MasteryHeatmap mastery={mastery} />
              </div>
            )}

            <TopicMasteryCards mastery={mastery} />
          </section>
        </TabsContent>

        {/* ── Score Trend tab ─────────────────────────────────────────────── */}
        <TabsContent value="score" className="mt-4">
          <section>
            <SectionHeader
              icon={Calendar}
              title="Score Prediction"
              subtitle="Projected SAT score based on current mastery and study consistency"
            />
            <PredictedScoreWidget
              predictions={predictions}
              targetScore={profile?.target_score ?? null}
              currentScore={profile?.current_score ?? null}
            />
          </section>
        </TabsContent>

        {/* ── Plan History tab ─────────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4">
          <section>
            <SectionHeader
              icon={History}
              title="Plan Version History"
              subtitle="Every replan creates a snapshot. Restore any version to roll back future tasks."
            />
            <PlanVersionHistory versions={versions} />
          </section>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Mastery heatmap (compact) ────────────────────────────────────────────────

function MasteryHeatmap({ mastery }: { mastery: MasteryRow[] }) {
  const masteryByKey = new Map(mastery.map(m => [m.domain_key, m]))

  const mathDomains = ['algebra', 'advancedMath', 'problemSolving', 'geometry']
  const rwDomains   = ['informationIdeas', 'craftStructure', 'expressionIdeas', 'standardEnglish']
  const mathLabels  = ['Algebra', 'Adv. Math', 'Data Analysis', 'Geometry & Trig']
  const rwLabels    = ['Info & Ideas', 'Craft & Struct.', 'Expression', 'Std. English']

  function cellColor(score: number) {
    if (score >= 90) return 'bg-emerald-500'
    if (score >= 70) return 'bg-violet-500'
    if (score >= 50) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Mastery Heatmap</p>
        <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-rose-500 inline-block" /> &lt;50</span>
          <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-amber-500 inline-block" /> 50–69</span>
          <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-violet-500 inline-block" /> 70–89</span>
          <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-emerald-500 inline-block" /> 90+</span>
        </div>
      </div>

      {/* Math row */}
      <div>
        <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5">Math</p>
        <div className="grid grid-cols-4 gap-2">
          {mathDomains.map((key, i) => {
            const m = masteryByKey.get(key)
            const score = m?.mastery_score ?? 50
            return (
              <div key={key} className="space-y-1">
                <div className={cn('h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm', cellColor(score))}>
                  {score}
                </div>
                <p className="text-[10px] text-center text-[var(--muted-foreground)] leading-tight">{mathLabels[i]}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* R&W row */}
      <div>
        <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5">Reading & Writing</p>
        <div className="grid grid-cols-4 gap-2">
          {rwDomains.map((key, i) => {
            const m = masteryByKey.get(key)
            const score = m?.mastery_score ?? 50
            return (
              <div key={key} className="space-y-1">
                <div className={cn('h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm', cellColor(score))}>
                  {score}
                </div>
                <p className="text-[10px] text-center text-[var(--muted-foreground)] leading-tight">{rwLabels[i]}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
