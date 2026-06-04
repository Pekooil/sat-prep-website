'use client'

import * as React from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CheckCheck, AlertTriangle, TrendingUp, TrendingDown, BookOpen, RefreshCw, Info } from 'lucide-react'
import { markRecommendationRead } from '@/actions/adaptive-replanner'

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

interface AIRecommendationsProps {
  recommendations: RecommendationRow[]
}

const TYPE_CONFIG: Record<RecommendationType, {
  icon: React.FC<{ className?: string }>
  label: string
  iconClass: string
  borderClass: string
  bgClass: string
}> = {
  intervention:    {
    icon: AlertTriangle, label: 'Intervention',
    iconClass: 'text-rose-600',
    borderClass: 'border-rose-200 dark:border-rose-800',
    bgClass: 'bg-rose-50/60 dark:bg-rose-950/20',
  },
  schedule_change: {
    icon: TrendingDown, label: 'Schedule Change',
    iconClass: 'text-amber-600',
    borderClass: 'border-amber-200 dark:border-amber-800',
    bgClass: 'bg-amber-50/60 dark:bg-amber-950/20',
  },
  increase_volume: {
    icon: TrendingUp, label: 'Increase Volume',
    iconClass: 'text-amber-600',
    borderClass: 'border-amber-200 dark:border-amber-800',
    bgClass: 'bg-amber-50/60 dark:bg-amber-950/20',
  },
  recovery: {
    icon: RefreshCw, label: 'Recovery',
    iconClass: 'text-blue-600',
    borderClass: 'border-blue-200 dark:border-blue-800',
    bgClass: 'bg-blue-50/60 dark:bg-blue-950/20',
  },
  reduce_volume: {
    icon: BookOpen, label: 'Reduce Volume',
    iconClass: 'text-emerald-600',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    bgClass: 'bg-emerald-50/60 dark:bg-emerald-950/20',
  },
  maintenance: {
    icon: CheckCheck, label: 'Maintenance',
    iconClass: 'text-emerald-600',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    bgClass: 'bg-emerald-50/60 dark:bg-emerald-950/20',
  },
  general: {
    icon: Info, label: 'Note',
    iconClass: 'text-blue-600',
    borderClass: 'border-blue-200 dark:border-blue-800',
    bgClass: 'bg-blue-50/60 dark:bg-blue-950/20',
  },
}

export function AIRecommendations({ recommendations }: AIRecommendationsProps) {
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set())

  const unread = recommendations.filter(r => !r.is_read && !readIds.has(r.id))
  const read   = recommendations.filter(r => r.is_read || readIds.has(r.id))

  async function handleMarkRead(id: string) {
    setReadIds(prev => new Set([...prev, id]))
    await markRecommendationRead(id)
  }

  async function handleMarkAllRead() {
    const ids = unread.map(r => r.id)
    setReadIds(prev => new Set([...prev, ...ids]))
    await Promise.all(ids.map(markRecommendationRead))
  }

  if (recommendations.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-8 text-center">
        <CheckCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
        <p className="text-sm font-medium">All caught up!</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          AI coach recommendations will appear here after each replan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {unread.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--muted-foreground)]">
            {unread.length} new insight{unread.length !== 1 ? 's' : ''}
          </p>
          {unread.length > 1 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
      )}

      {/* Unread */}
      {unread.map(r => <RecommendationCard key={r.id} rec={r} onRead={handleMarkRead} />)}

      {/* Read (collapsed) */}
      {read.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-[var(--muted-foreground)] list-none flex items-center gap-1 py-1 select-none">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
            {read.length} previous insight{read.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2">
            {read.map(r => <RecommendationCard key={r.id} rec={r} dimmed />)}
          </div>
        </details>
      )}
    </div>
  )
}

function RecommendationCard({
  rec,
  onRead,
  dimmed,
}: {
  rec: RecommendationRow
  onRead?: (id: string) => void
  dimmed?: boolean
}) {
  const cfg = TYPE_CONFIG[rec.recommendation_type]
  const Icon = cfg.icon

  return (
    <div className={cn(
      'rounded-lg border p-3 space-y-2 transition-opacity',
      cfg.borderClass,
      cfg.bgClass,
      dimmed && 'opacity-60',
    )}>
      <div className="flex items-start gap-2">
        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.iconClass)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              {cfg.label}
            </span>
            {rec.domain_label && (
              <span className="text-[10px] bg-[var(--muted)] rounded px-1.5 py-0.5 font-medium">
                {rec.domain_label}
              </span>
            )}
            {rec.old_mastery !== null && rec.new_mastery !== null && (
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {Math.round(rec.old_mastery)} → {Math.round(rec.new_mastery)}
              </span>
            )}
          </div>
          <p className="text-sm mt-1 leading-snug">{rec.message}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[var(--muted-foreground)]">
          {formatDistanceToNow(parseISO(rec.created_at), { addSuffix: true })}
        </p>
        {onRead && !rec.is_read && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-5 px-2"
            onClick={() => onRead(rec.id)}
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  )
}
