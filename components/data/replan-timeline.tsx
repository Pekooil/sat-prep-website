'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, BookOpen, TrendingUp, Settings2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ReplanAuditLog } from '@/types'

interface ReplanTimelineProps {
  replans: ReplanAuditLog[]
}

const TRIGGER_META: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  question_session:    { label: 'Session',    icon: BookOpen    },
  error_log:           { label: 'Error Log',  icon: RefreshCw   },
  practice_test_score: { label: 'Test Score', icon: TrendingUp  },
  manual:              { label: 'Manual',     icon: Settings2   },
}

type DomainPriority = {
  label: string
  newPriorityScore: number
  newAccuracy: number
}

export function ReplanTimeline({ replans }: ReplanTimelineProps) {
  if (replans.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Replan History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-sunken)] mb-3">
            <RefreshCw className="h-5 w-5 text-[var(--text-muted)]" strokeWidth={1.75} />
          </div>
          <p className="font-medium text-sm">No replanning yet</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 text-center">
            The adaptive planner runs automatically after each session.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Show last 10 most recent, newest first
  const recent = [...replans].reverse().slice(0, 10)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Replan History</CardTitle>
          <span className="text-xs text-[var(--muted-foreground)]">{replans.length} runs total</span>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Adaptive planner runs triggered by your activity
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-[var(--border)]" />

          <div className="space-y-4">
            {recent.map((r, i) => {
              const meta     = TRIGGER_META[r.triggered_by] ?? TRIGGER_META.manual
              const Icon     = meta.icon
              const domains  = (r.domains_reprioritized as DomainPriority[] | null) ?? []
              const top3     = domains.slice(0, 3)

              return (
                <div key={r.id} className="flex gap-3 relative">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--card)] border border-[var(--border)]">
                    <Icon className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  </div>

                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" size="sm" className="text-[10px] py-0">
                          {meta.label}
                        </Badge>
                        {r.tasks_updated > 0 && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {r.tasks_updated} task{r.tasks_updated !== 1 ? 's' : ''} updated
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                        {formatDate(r.created_at)}
                      </span>
                    </div>

                    {/* Top domains */}
                    {top3.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {top3.map(d => (
                          <span
                            key={d.label}
                            className="inline-flex items-center gap-1 rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                          >
                            <span className="font-medium text-[var(--foreground)]">
                              {d.label.length > 18 ? d.label.slice(0, 16) + '…' : d.label}
                            </span>
                            <span className="opacity-70">P{d.newPriorityScore}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Summary */}
                    {r.changes_summary && i < 3 && (
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-1 line-clamp-1">
                        {r.changes_summary}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
