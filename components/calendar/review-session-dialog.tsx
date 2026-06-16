'use client'

import * as React from 'react'
import {
  X, CheckCircle2, Circle, Pencil, ChevronDown, ChevronUp, BookOpenCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, subjectLabel } from '@/lib/utils'
import { markErrorMastered } from '@/actions/error-logs'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { CalendarTask, ErrorLog } from '@/types'
import { EditErrorDialog } from '@/components/error-log/edit-error-dialog'
import { MistakeTypeBadge } from '@/components/error-log/mistake-type-badge'
import type { MistakeTypeKey } from '@/components/error-log/mistake-type-badge'
import { getCategoryColor } from './task-colors'

interface ReviewSessionDialogProps {
  task: CalendarTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMarkComplete: (task: CalendarTask) => void
}

export function ReviewSessionDialog({
  task,
  open,
  onOpenChange,
  onMarkComplete,
}: ReviewSessionDialogProps) {
  const { toast } = useToast()
  const [errors, setErrors] = React.useState<ErrorLog[]>([])
  const [loading, setLoading] = React.useState(false)
  const [editError, setEditError] = React.useState<ErrorLog | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = React.useMemo(() => createClient(), [])

  async function fetchErrors() {
    const { data } = await supabase
      .from('error_logs')
      .select('*')
      .eq('mastered', false)
      .eq('archived', false)
      .order('created_at', { ascending: false })
    setErrors((data ?? []) as ErrorLog[])
  }

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('error_logs')
      .select('*')
      .eq('mastered', false)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setErrors((data ?? []) as ErrorLog[])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [open, supabase])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function handleToggleMastered(error: ErrorLog) {
    const result = await markErrorMastered(error.id, true)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Marked as mastered!' })
      setErrors(prev => prev.filter(e => e.id !== error.id))
    }
  }

  const colors = getCategoryColor('Review Session')

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review Session"
        className={cn(
          'fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col',
          'bg-[var(--card)] border-l border-[var(--border)] shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {task && (
          <>
            {/* ── Header ── */}
            <div className={cn('p-5 border-b border-[var(--border)]', colors.bg)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', colors.dot)} />
                    <span className={cn('text-xs font-semibold uppercase tracking-wide', colors.text)}>
                      Review Session
                    </span>
                    {task.is_completed && (
                      <Badge variant="success" className="text-[10px] py-0 ml-1">Done</Badge>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-[var(--foreground)] leading-snug">
                    Active Mistakes
                  </h2>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Work through each open mistake, update your understanding, and mark mastered ones complete.
                  </p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-sm p-1 opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-lg border border-[var(--border)] p-4 animate-pulse">
                      <div className="h-4 bg-[var(--muted)] rounded w-3/4 mb-2" />
                      <div className="h-3 bg-[var(--muted)] rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : errors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpenCheck className="h-8 w-8 text-emerald-500 mb-3" />
                  <p className="text-sm font-medium text-[var(--foreground)]">No active mistakes</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[200px]">
                    All your logged mistakes are mastered or archived.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[var(--muted-foreground)] pb-1">
                    {errors.length} active mistake{errors.length !== 1 ? 's' : ''} to review
                  </p>
                  {errors.map(error => (
                    <ReviewErrorCard
                      key={error.id}
                      error={error}
                      onToggleMastered={handleToggleMastered}
                      onEdit={setEditError}
                    />
                  ))}
                </>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="p-4 border-t border-[var(--border)] flex gap-2">
              {task.is_completed ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Session completed
                </div>
              ) : (
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => { onMarkComplete(task); onOpenChange(false) }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Session Complete
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit Error Dialog */}
      {editError && (
        <EditErrorDialog
          open={!!editError}
          onOpenChange={open => { if (!open) setEditError(null) }}
          error={editError}
          onSuccess={() => { setEditError(null); fetchErrors() }}
        />
      )}
    </>
  )
}

// ─── Review Error Card ────────────────────────────────────────────────────────

function ReviewErrorCard({
  error,
  onToggleMastered,
  onEdit,
}: {
  error: ErrorLog
  onToggleMastered: (error: ErrorLog) => void
  onEdit: (error: ErrorLog) => void
}) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div className={cn(
      'rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 transition-all',
    )}>
      <div className="flex items-start gap-2.5">
        {/* Mastered toggle */}
        <button
          onClick={() => onToggleMastered(error)}
          className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
          title="Mark mastered"
        >
          <Circle className="h-5 w-5 text-[var(--muted-foreground)] hover:text-emerald-500 transition-colors" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-medium leading-snug text-[var(--foreground)]">
              {error.description}
            </p>
            <div className="flex items-center gap-0.5 shrink-0 ml-1">
              <button
                onClick={() => onEdit(error)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--muted-foreground)]"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--muted-foreground)]"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded
                  ? <ChevronUp className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge
              variant={error.subject === 'math' ? 'math' : 'reading'}
              className="text-[10px]"
            >
              {subjectLabel(error.subject)}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">{error.category}</Badge>
            {error.subcategory && (
              <Badge variant="outline" className="text-[10px]">{error.subcategory}</Badge>
            )}
            <MistakeTypeBadge
              type={error.error_type as MistakeTypeKey}
              customLabel={error.custom_mistake_type}
              size="sm"
            />
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-2.5 pt-2.5 border-t border-[var(--border)] space-y-2 text-xs">
              {error.my_answer && (
                <div>
                  <span className="font-medium text-[var(--muted-foreground)]">What I did: </span>
                  <span className="text-[var(--foreground)]">{error.my_answer}</span>
                </div>
              )}
              {error.correct_approach && (
                <div>
                  <span className="font-medium text-[var(--muted-foreground)]">Correct approach: </span>
                  <span className="text-[var(--foreground)]">{error.correct_approach}</span>
                </div>
              )}
              {error.corrected_explanation && (
                <div className="rounded-md bg-[var(--accent-soft)] border border-[var(--border)] p-2">
                  <span className="font-medium text-[var(--accent-soft-foreground)]">My explanation: </span>
                  <span className="text-[var(--accent-soft-foreground)]">{error.corrected_explanation}</span>
                </div>
              )}
              <Button
                size="sm"
                className="h-7 text-xs gap-1 mt-1"
                onClick={() => onToggleMastered(error)}
              >
                <CheckCircle2 className="h-3 w-3" />
                Mark mastered
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
