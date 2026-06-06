'use client'

import { format, parseISO } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface PredictedScoreWidgetProps {
  predictions: PredictionRow[]
  targetScore: number | null
  currentScore: number | null
}

export function PredictedScoreWidget({
  predictions,
  targetScore,
  currentScore,
}: PredictedScoreWidgetProps) {
  const latest = predictions[0]

  if (!latest) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-[var(--muted-foreground)]">
          No score predictions yet. Complete a study session to generate your first prediction.
        </CardContent>
      </Card>
    )
  }

  const ciWidth = latest.predicted_score - latest.confidence_low
  const gap     = targetScore ? targetScore - latest.predicted_score : null

  // Determine trend from last two predictions
  const prev    = predictions[1]
  const delta   = prev ? latest.predicted_score - prev.predicted_score : null
  const TrendIcon = delta === null ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const trendColor = delta === null ? '' : delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'

  // Chart data: show last 15 predictions in chronological order
  const chartData = [...predictions]
    .slice(0, 15)
    .reverse()
    .map(p => ({
      date:  format(parseISO(p.created_at), 'MMM d'),
      score: p.predicted_score,
      low:   p.confidence_low,
      high:  p.confidence_high,
    }))

  return (
    <div className="space-y-4">
      {/* Main score display */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Predicted score */}
        <Card className="sm:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
              Predicted Score
            </p>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold font-mono tabular-nums">{latest.predicted_score}</p>
              {TrendIcon && delta !== null && (
                <div className={cn('flex items-center gap-0.5 mb-1', trendColor)}>
                  <TrendIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {delta > 0 ? '+' : ''}{delta}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Range: {latest.confidence_low}–{latest.confidence_high} (±{ciWidth})
            </p>
          </CardContent>
        </Card>

        {/* Confidence interval detail */}
        <Card className="sm:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
              Confidence Interval
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums">{latest.confidence_low}–{latest.confidence_high}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Based on {latest.session_count ?? 0} sessions
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Study consistency: {Math.round((latest.consistency_factor ?? 0) * 100)}%
            </p>
          </CardContent>
        </Card>

        {/* Gap to target */}
        <Card className="sm:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
              Gap to Target
            </p>
            {gap !== null ? (
              <>
                <p className={cn('text-2xl font-bold font-mono tabular-nums', gap <= 0 ? 'text-emerald-600' : '')}>
                  {gap <= 0 ? 'On Track!' : `${gap} pts`}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Target: {targetScore}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Current: {currentScore ?? latest.baseline_score ?? '—'}
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No target set</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score trend chart */}
      {chartData.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Predicted Score History</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[400, 1600]}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [value, 'Predicted']}
                  />
                  {targetScore && (
                    <ReferenceLine
                      y={targetScore}
                      stroke="#6366f1"
                      strokeDasharray="4 4"
                      label={{ value: 'Target', position: 'right', fontSize: 10, fill: '#6366f1' }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#7c3aed' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it's computed */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
        <p className="text-xs font-medium mb-1">How this is calculated</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Predicted score = current score + mastery-weighted domain gains × study consistency.
          The confidence interval (±{ciWidth}) narrows as you log more sessions.
          Completing more sessions of high-priority topics increases the prediction.
        </p>
      </div>
    </div>
  )
}
