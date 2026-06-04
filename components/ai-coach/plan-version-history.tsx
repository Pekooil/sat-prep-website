'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { RotateCcw, ChevronDown, ChevronRight, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { restoreVersion } from '@/actions/adaptive-replanner'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface VersionRow {
  id: string
  version_number: number
  triggered_by: string
  reason: string | null
  tasks_updated: number
  predicted_score: number | null
  created_at: string
}

interface PlanVersionHistoryProps {
  versions: VersionRow[]
}

const TRIGGER_LABELS: Record<string, string> = {
  question_session:  'Study Session',
  error_log:         'Error Log',
  practice_test_score: 'Practice Test',
  manual:            'Manual Replan',
  behind_schedule:   'Behind Schedule',
}

const TRIGGER_COLORS: Record<string, string> = {
  question_session:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  error_log:           'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  practice_test_score: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  manual:              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  behind_schedule:     'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

export function PlanVersionHistory({ versions }: PlanVersionHistoryProps) {
  const { toast } = useToast()
  const router    = useRouter()
  const [restoring, setRestoring] = React.useState<string | null>(null)
  const [expanded, setExpanded]   = React.useState<string | null>(null)

  if (versions.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-8 text-center">
        <GitBranch className="mx-auto h-8 w-8 text-[var(--muted-foreground)] mb-2" />
        <p className="text-sm font-medium">No versions yet</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          Every replan creates a version snapshot. Click &quot;Replan Now&quot; to create your first.
        </p>
      </div>
    )
  }

  async function handleRestore(id: string, versionNumber: number) {
    setRestoring(id)
    try {
      const result = await restoreVersion(id)
      if (result.error) {
        toast({ title: 'Restore failed', description: result.error, variant: 'destructive' })
      } else {
        toast({
          title: `Version ${versionNumber} restored`,
          description: `${result.restored} future tasks restored to their previous state.`,
        })
        router.refresh()
      }
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted-foreground)]">
        Each replan creates an automatic snapshot. Restore any version to roll back future tasks.
        Completed tasks are never affected.
      </p>

      <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
        {versions.map((v, idx) => {
          const isExpanded = expanded === v.id
          const isCurrent  = idx === 0

          return (
            <div key={v.id} className={cn(isCurrent && 'bg-[var(--muted)]/30')}>
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Version number */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-bold">
                  v{v.version_number}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                      TRIGGER_COLORS[v.triggered_by] ?? TRIGGER_COLORS.manual,
                    )}>
                      {TRIGGER_LABELS[v.triggered_by] ?? v.triggered_by}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-medium text-[var(--muted-foreground)]">Current</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--muted-foreground)]">
                    <span>{format(parseISO(v.created_at), 'MMM d, yyyy h:mm a')}</span>
                    <span>{v.tasks_updated} tasks updated</span>
                    {v.predicted_score && <span>Predicted: {v.predicted_score}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setExpanded(isExpanded ? null : v.id)}
                  >
                    {isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5" />
                      : <ChevronRight className="h-3.5 w-3.5" />
                    }
                  </Button>
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={restoring === v.id}
                      onClick={() => handleRestore(v.id, v.version_number)}
                    >
                      <RotateCcw className="h-3 w-3" />
                      {restoring === v.id ? 'Restoring…' : 'Restore'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-3 border-t border-[var(--border)] bg-[var(--muted)]/20">
                  <VersionDetail version={v} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VersionDetail({ version }: { version: VersionRow }) {
  return (
    <div className="pt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
      <InfoRow label="Trigger"       value={TRIGGER_LABELS[version.triggered_by] ?? version.triggered_by} />
      <InfoRow label="Tasks Updated" value={version.tasks_updated.toString()} />
      <InfoRow label="Predicted Score" value={version.predicted_score ? version.predicted_score.toString() : '—'} />
      <InfoRow label="Created"       value={format(parseISO(version.created_at), 'MMM d, yyyy h:mm a')} />
      {version.reason && <InfoRow label="Reason" value={version.reason} className="col-span-2" />}
    </div>
  )
}

function InfoRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[var(--muted-foreground)]">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
