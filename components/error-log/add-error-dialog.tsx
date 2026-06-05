'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { createErrorLog } from '@/actions/error-logs'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { MATH_DOMAINS, RW_DOMAINS, ERROR_TYPES } from '@/lib/constants'

interface AddErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Still unclear', 2: 'Getting there', 3: 'Understand it', 4: 'Confident', 5: 'Mastered',
}
const CONFIDENCE_COLORS: Record<number, string> = {
  1: 'bg-red-500 text-white border-red-500',
  2: 'bg-orange-500 text-white border-orange-500',
  3: 'bg-amber-400 text-white border-amber-400',
  4: 'bg-lime-500 text-white border-lime-500',
  5: 'bg-emerald-500 text-white border-emerald-500',
}
const ANSWER_LETTERS = ['A', 'B', 'C', 'D'] as const

export function AddErrorDialog({ open, onOpenChange, onSuccess }: AddErrorDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)

  // Form state
  const [subject, setSubject]               = React.useState<'math' | 'reading_writing'>('math')
  const [selectedDomain, setSelectedDomain] = React.useState('')
  const [selectedSkill, setSelectedSkill]   = React.useState('')
  const [errorType, setErrorType]           = React.useState('')
  const [customMistakeType, setCustomMistakeType] = React.useState('')
  const [questionId, setQuestionId]         = React.useState('')
  const [studentAnswer, setStudentAnswer]   = React.useState('__none__')
  const [correctAnswer, setCorrectAnswer]   = React.useState('__none__')
  const [confidenceRating, setConfidenceRating] = React.useState<number | null>(null)

  const domains = subject === 'math' ? MATH_DOMAINS : RW_DOMAINS
  const skills  = domains.find(d => d.value === selectedDomain)?.skills ?? []

  function resetForm() {
    setSubject('math'); setSelectedDomain(''); setSelectedSkill('')
    setErrorType(''); setCustomMistakeType('')
    setQuestionId(''); setStudentAnswer('__none__'); setCorrectAnswer('__none__')
    setConfidenceRating(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const description = (fd.get('description') as string).trim()
    if (!description) return

    if (questionId && questionId.length !== 8) {
      toast({ title: 'Invalid Question ID', description: 'Must be exactly 8 characters (A–Z, 0–9).', variant: 'destructive' })
      return
    }

    setLoading(true)
    const domainData = domains.find(d => d.value === selectedDomain)

    const result = await createErrorLog({
      subject,
      category:              domainData?.label ?? 'Other',
      subcategory:           selectedSkill || null,
      error_type:            (errorType || 'other') as 'concept' | 'careless' | 'time' | 'strategy' | 'other',
      custom_mistake_type:   errorType === 'other' ? customMistakeType.trim() || null : null,
      question_id:           questionId || null,
      student_answer:        studentAnswer !== '__none__' ? studentAnswer as 'A' | 'B' | 'C' | 'D' : null,
      correct_answer:        correctAnswer !== '__none__' ? correctAnswer as 'A' | 'B' | 'C' | 'D' : null,
      description,
      my_answer:             (fd.get('my_answer') as string).trim() || null,
      correct_approach:      (fd.get('correct_approach') as string).trim() || null,
      corrected_explanation: (fd.get('corrected_explanation') as string).trim() || null,
      confidence_rating:     confidenceRating,
      college_board_domain:  domainData?.label ?? null,
      college_board_skill:   selectedSkill || null,
    })

    setLoading(false)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Error logged!', description: "Keep tracking and you'll master it soon." })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log an Error</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section */}
          <div className="space-y-2">
            <Label>Section</Label>
            <div className="flex gap-2">
              {(['math', 'reading_writing'] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => { setSubject(s); setSelectedDomain(''); setSelectedSkill('') }}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium border transition-colors',
                    subject === s
                      ? s === 'math' ? 'bg-purple-600 text-white border-purple-600' : 'bg-violet-600 text-white border-violet-600'
                      : 'border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  {s === 'math' ? 'Math' : 'Reading & Writing'}
                </button>
              ))}
            </div>
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label>Domain</Label>
            <Select onValueChange={v => { setSelectedDomain(v); setSelectedSkill('') }}>
              <SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger>
              <SelectContent>
                {domains.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Skill */}
          {skills.length > 0 && (
            <div className="space-y-2">
              <Label>Skill <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
              <Select onValueChange={v => setSelectedSkill(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-[var(--muted-foreground)]">— none —</SelectItem>
                  {skills.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mistake type */}
          <div className="space-y-2">
            <Label>Mistake Type *</Label>
            <Select value={errorType} onValueChange={setErrorType} required>
              <SelectTrigger><SelectValue placeholder="What kind of mistake?" /></SelectTrigger>
              <SelectContent>
                {ERROR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errorType === 'other' && (
              <Input
                value={customMistakeType}
                onChange={e => setCustomMistakeType(e.target.value)}
                placeholder="Name your mistake type (e.g. Misread Question, Unit error…)"
                className="mt-1"
              />
            )}
          </div>

          {/* Question ID */}
          <div className="space-y-2">
            <Label>Question ID <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
            <p className="text-xs text-[var(--muted-foreground)]">
              8-character identifier from the question bank (e.g.&nbsp;CBFB2B8D). Question content is never stored.
            </p>
            <Input
              value={questionId}
              onChange={e => setQuestionId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={8}
              placeholder="CBFB2B8D"
              className="font-mono uppercase tracking-widest"
            />
          </div>

          {/* Answers */}
          <div className="space-y-2">
            <Label>Answers <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs text-[var(--muted-foreground)]">Your (wrong) answer</p>
                <Select value={studentAnswer} onValueChange={setStudentAnswer}>
                  <SelectTrigger className="font-mono"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {ANSWER_LETTERS.map(l => <SelectItem key={l} value={l} className="font-mono">{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-[var(--muted-foreground)]">Correct answer</p>
                <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                  <SelectTrigger className="font-mono"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {ANSWER_LETTERS.map(l => <SelectItem key={l} value={l} className="font-mono">{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* What went wrong */}
          <div className="space-y-2">
            <Label htmlFor="add-desc">What went wrong? *</Label>
            <Textarea id="add-desc" name="description" required className="h-20"
              placeholder="Describe the mistake or concept you struggled with…" />
          </div>

          {/* What did you do */}
          <div className="space-y-2">
            <Label htmlFor="add-my-answer">What did you do? <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
            <Textarea id="add-my-answer" name="my_answer" className="h-14"
              placeholder="Your incorrect reasoning or approach…" />
          </div>

          {/* Correct approach */}
          <div className="space-y-2">
            <Label htmlFor="add-correct">Correct approach <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
            <Textarea id="add-correct" name="correct_approach" className="h-14"
              placeholder="The right way to solve this type of problem…" />
          </div>

          {/* Corrected explanation */}
          <div className="space-y-2">
            <Label htmlFor="add-explanation">Your corrected explanation <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
            <p className="text-xs text-[var(--muted-foreground)]">In your own words — writing it helps it stick.</p>
            <Textarea id="add-explanation" name="corrected_explanation" className="h-20"
              placeholder="In my own words, the correct approach is…" />
          </div>

          {/* Confidence */}
          <div className="space-y-2">
            <Label>Confidence <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
            <p className="text-xs text-[var(--muted-foreground)]">How confident are you that you won&apos;t repeat this?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button"
                  onClick={() => setConfidenceRating(confidenceRating === n ? null : n)}
                  title={CONFIDENCE_LABELS[n]}
                  className={cn(
                    'flex-1 flex flex-col items-center py-2 rounded-lg border text-sm font-bold transition-colors',
                    confidenceRating === n ? CONFIDENCE_COLORS[n] : 'border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800 text-[var(--muted-foreground)]'
                  )}
                >
                  {n}
                  <span className="text-[8px] font-normal leading-tight text-center mt-0.5 hidden sm:block">{CONFIDENCE_LABELS[n]}</span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !errorType}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Error
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
