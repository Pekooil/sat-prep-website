'use client'

import { CheckCircle2, Circle, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { markErrorMastered, deleteErrorLog } from '@/actions/error-logs'
import type { ErrorLog } from '@/types'
import { cn, subjectLabel, errorTypeLabel, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface ErrorRowProps {
  error: ErrorLog
  onReload: () => void
}

export function ErrorRow({ error, onReload }: ErrorRowProps) {
  const [expanded, setExpanded] = React.useState(false)
  const { toast } = useToast()

  async function handleToggleMastered() {
    const result = await markErrorMastered(error.id, !error.mastered)
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' })
    else {
      toast({ title: error.mastered ? 'Marked for review' : '✅ Marked as mastered!' })
      onReload()
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this error log?')) return
    const result = await deleteErrorLog(error.id)
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' })
    else onReload()
  }

  return (
    <Card className={cn('transition-all', error.mastered && 'opacity-70')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={handleToggleMastered} className="mt-0.5 shrink-0">
            {error.mastered
              ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              : <Circle className="h-5 w-5 text-[var(--muted-foreground)]" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn('text-sm font-medium leading-snug', error.mastered && 'line-through text-[var(--muted-foreground)]')}>
                {error.description}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--muted-foreground)]"
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--muted-foreground)] hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={error.subject === 'math' ? 'math' : 'reading'} className="text-[10px]">
                {subjectLabel(error.subject)}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">{error.category}</Badge>
              <Badge
                variant={
                  error.error_type === 'concept' ? 'destructive'
                  : error.error_type === 'careless' ? 'warning'
                  : 'secondary'
                }
                className="text-[10px]"
              >
                {errorTypeLabel(error.error_type)}
              </Badge>
              {error.mastered && <Badge variant="success" className="text-[10px]">Mastered ✓</Badge>}
              <span className="text-[10px] text-[var(--muted-foreground)]">{formatDate(error.created_at)}</span>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pl-8 space-y-2 border-t border-[var(--border)] pt-3">
            {error.college_board_domain && (
              <div className="text-xs">
                <span className="font-medium text-[var(--muted-foreground)]">Domain: </span>
                {error.college_board_domain}
              </div>
            )}
            {error.college_board_skill && (
              <div className="text-xs">
                <span className="font-medium text-[var(--muted-foreground)]">Skill: </span>
                {error.college_board_skill}
              </div>
            )}
            {error.my_answer && (
              <div className="text-xs">
                <span className="font-medium text-[var(--muted-foreground)]">My answer: </span>
                {error.my_answer}
              </div>
            )}
            {error.correct_approach && (
              <div className="text-xs">
                <span className="font-medium text-[var(--muted-foreground)]">Correct approach: </span>
                {error.correct_approach}
              </div>
            )}
            {error.subcategory && (
              <div className="text-xs">
                <span className="font-medium text-[var(--muted-foreground)]">Subcategory: </span>
                {error.subcategory}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant={error.mastered ? 'outline' : 'default'}
                className="h-7 text-xs gap-1"
                onClick={handleToggleMastered}
              >
                {error.mastered ? 'Unmark mastered' : '✓ Mark mastered'}
              </Button>
              {error.review_count > 0 && (
                <span className="text-xs text-[var(--muted-foreground)]">Reviewed {error.review_count}×</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
