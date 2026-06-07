'use client'

import { CheckCircle2, Circle, Trash2, ChevronDown, ChevronUp, Pencil, Archive, ArchiveRestore } from 'lucide-react'
import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { markErrorMastered, deleteErrorLog, archiveErrorLog } from '@/actions/error-logs'
import type { ErrorLog } from '@/types'
import { cn, subjectLabel, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { MistakeTypeBadge } from './mistake-type-badge'
import { EditErrorDialog } from './edit-error-dialog'

interface ErrorRowProps {
  error: ErrorLog
  onReload: () => void
}

const CONFIDENCE_TEXT: Record<number, string> = {
  1: 'Still unclear', 2: 'Getting there', 3: 'Understand it', 4: 'Confident', 5: 'Mastered',
}
const CONFIDENCE_BG: Record<number, string> = {
  1: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  3: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  4: 'bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300',
  5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
}

export function ErrorRow({ error, onReload }: ErrorRowProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const { toast } = useToast()
  const isArchived = error.archived === true

  async function handleToggleMastered() {
    const result = await markErrorMastered(error.id, !error.mastered)
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' })
    else { toast({ title: error.mastered ? 'Marked for review' : 'Marked as mastered!' }); onReload() }
  }

  async function handleArchive() {
    const result = await archiveErrorLog(error.id, !isArchived)
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' })
    else { toast({ title: isArchived ? 'Restored to active' : 'Archived' }); onReload() }
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this error log?')) return
    const result = await deleteErrorLog(error.id)
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' })
    else onReload()
  }

  return (
    <>
      <Card className={cn('transition-all', error.mastered && 'opacity-60', isArchived && 'opacity-50 border-dashed')}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Mastered toggle */}
            <button onClick={handleToggleMastered} className="mt-0.5 shrink-0" title={error.mastered ? 'Unmark mastered' : 'Mark mastered'}>
              {error.mastered
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                : <Circle className="h-5 w-5 text-[var(--muted-foreground)]" />}
            </button>

            <div className="flex-1 min-w-0">
              {/* Description + actions */}
              <div className="flex items-start justify-between gap-2">
                <p className={cn('text-sm font-medium leading-snug', error.mastered && 'line-through text-[var(--muted-foreground)]')}>
                  {error.description}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditOpen(true)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--muted-foreground)]" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--muted-foreground)]">
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button onClick={handleArchive} className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-[var(--muted-foreground)] hover:text-amber-600" title={isArchived ? 'Restore' : 'Archive'}>
                    {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  </button>
                  <button onClick={handleDelete} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--muted-foreground)] hover:text-red-500" title="Delete permanently">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Badge row */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Badge variant={error.subject === 'math' ? 'math' : 'reading'} className="text-[10px]">
                  {subjectLabel(error.subject)}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">{error.category}</Badge>
                {error.subcategory && (
                  <Badge variant="outline" className="text-[10px]">{error.subcategory}</Badge>
                )}

                {/* Mistake type badge — uses custom label when error_type = 'other' */}
                <MistakeTypeBadge
                  type={error.error_type}
                  customLabel={error.custom_mistake_type}
                  size="sm"
                />

                {/* Question ID chip */}
                {error.question_id && (
                  <span className="inline-flex items-center font-mono text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-300 tracking-widest">
                    #{error.question_id}
                  </span>
                )}

                {/* Answer chips */}
                {(error.student_answer || error.correct_answer) && (
                  <span className="inline-flex items-center gap-1">
                    {error.student_answer && (
                      <span className="font-mono text-[10px] font-bold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800 rounded px-1.5 py-0.5">
                        {error.student_answer}
                      </span>
                    )}
                    {error.student_answer && error.correct_answer && (
                      <span className="text-[10px] text-[var(--muted-foreground)]">→</span>
                    )}
                    {error.correct_answer && (
                      <span className="font-mono text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded px-1.5 py-0.5">
                        {error.correct_answer}
                      </span>
                    )}
                  </span>
                )}

                {/* Confidence pill */}
                {error.confidence_rating && (
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', CONFIDENCE_BG[error.confidence_rating])}>
                    {error.confidence_rating}/5 confidence
                  </span>
                )}

                {error.mastered && (
                  <Badge variant="success" className="text-[10px] gap-0.5 inline-flex items-center">
                    <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                    Mastered
                  </Badge>
                )}
                {isArchived && <Badge variant="outline" className="text-[10px] opacity-60">Archived</Badge>}
                <span className="text-[10px] text-[var(--muted-foreground)]">{formatDate(error.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="mt-3 pl-8 space-y-2 border-t border-[var(--border)] pt-3 text-xs">
              {error.subcategory && (
                <div><span className="font-medium text-[var(--muted-foreground)]">Skill: </span>{error.subcategory}</div>
              )}
              {error.question_id && (
                <div>
                  <span className="font-medium text-[var(--muted-foreground)]">Question ID: </span>
                  <span className="font-mono tracking-widest">{error.question_id}</span>
                </div>
              )}
              {(error.student_answer || error.correct_answer) && (
                <div className="flex items-center gap-3">
                  {error.student_answer && (
                    <span>
                      <span className="font-medium text-[var(--muted-foreground)]">Your answer: </span>
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">{error.student_answer}</span>
                    </span>
                  )}
                  {error.correct_answer && (
                    <span>
                      <span className="font-medium text-[var(--muted-foreground)]">Correct: </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{error.correct_answer}</span>
                    </span>
                  )}
                </div>
              )}
              {error.my_answer && (
                <div><span className="font-medium text-[var(--muted-foreground)]">What I did: </span>{error.my_answer}</div>
              )}
              {error.correct_approach && (
                <div><span className="font-medium text-[var(--muted-foreground)]">Correct approach: </span>{error.correct_approach}</div>
              )}
              {error.corrected_explanation && (
                <div className="rounded-md bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900 p-2">
                  <span className="font-medium text-violet-700 dark:text-violet-300">My explanation: </span>
                  <span>{error.corrected_explanation}</span>
                </div>
              )}
              {error.confidence_rating && (
                <div>
                  <span className="font-medium text-[var(--muted-foreground)]">Confidence: </span>
                  <span className="font-medium">{error.confidence_rating}/5 — {CONFIDENCE_TEXT[error.confidence_rating]}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant={error.mastered ? 'outline' : 'default'} className="h-7 text-xs gap-1" onClick={handleToggleMastered}>
                  {error.mastered ? 'Unmark mastered' : (
                    <><CheckCircle2 className="h-3 w-3 shrink-0" />Mark mastered</>
                  )}
                </Button>
                {error.review_count > 0 && (
                  <span className="text-[var(--muted-foreground)]">Reviewed {error.review_count}×</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditErrorDialog open={editOpen} onOpenChange={setEditOpen} error={error} onSuccess={onReload} />
    </>
  )
}
