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
import { updateErrorLog } from '@/actions/error-logs'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { MATH_DOMAINS, RW_DOMAINS, ERROR_TYPES } from '@/lib/constants'
import type { ErrorLog } from '@/types'

interface EditErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  error: ErrorLog
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

export function EditErrorDialog({ open, onOpenChange, error, onSuccess }: EditErrorDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)

  const allDomains = [...MATH_DOMAINS, ...RW_DOMAINS]
  const initialDomain = allDomains.find(d => d.label === error.category)

  const [subject, setSubject]               = React.useState<'math' | 'reading_writing'>(error.subject)
  const [selectedDomain, setSelectedDomain] = React.useState(initialDomain?.value ?? '')
  const [selectedSkill, setSelectedSkill]   = React.useState(error.subcategory ?? '')
  const [errorType, setErrorType]           = React.useState(error.error_type)
  const [customMistakeType, setCustomMistakeType] = React.useState(error.custom_mistake_type ?? '')
  const [questionId, setQuestionId]         = React.useState(error.question_id ?? '')
  const [studentAnswer, setStudentAnswer]   = React.useState(error.student_answer ?? '__none__')
  const [correctAnswer, setCorrectAnswer]   = React.useState(error.correct_answer ?? '__none__')
  const [description, setDescription]       = React.useState(error.description)
  const [myAnswer, setMyAnswer]             = React.useState(error.my_answer ?? '')
  const [correctApproach, setCorrectApproach]       = React.useState(error.correct_approach ?? '')
  const [correctedExplanation, setCorrectedExplanation] = React.useState(error.corrected_explanation ?? '')
  const [confidenceRating, setConfidenceRating]     = React.useState<number | null>(error.confidence_rating ?? null)

  // Re-sync when a different error is opened
  React.useEffect(() => {
    if (!open) return
    const dom = allDomains.find(d => d.label === error.category)
    setSubject(error.subject)
    setSelectedDomain(dom?.value ?? '')
    setSelectedSkill(error.subcategory ?? '')
    setErrorType(error.error_type)
    setCustomMistakeType(error.custom_mistake_type ?? '')
    setQuestionId(error.question_id ?? '')
    setStudentAnswer(error.student_answer ?? '__none__')
    setCorrectAnswer(error.correct_answer ?? '__none__')
    setDescription(error.description)
    setMyAnswer(error.my_answer ?? '')
    setCorrectApproach(error.correct_approach ?? '')
    setCorrectedExplanation(error.corrected_explanation ?? '')
    setConfidenceRating(error.confidence_rating ?? null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, error.id])

  const domains = subject === 'math' ? MATH_DOMAINS : RW_DOMAINS
  const skills  = domains.find(d => d.value === selectedDomain)?.skills ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return

    if (questionId && questionId.length !== 8) {
      toast({ title: 'Invalid Question ID', description: 'Must be exactly 8 characters (A–Z, 0–9).', variant: 'destructive' })
      return
    }

    setLoading(true)
    const domainData = domains.find(d => d.value === selectedDomain)

    const result = await updateErrorLog(error.id, {
      subject,
      category:              domainData?.label ?? error.category,
      subcategory:           selectedSkill || null,
      error_type:            errorType,
      custom_mistake_type:   errorType === 'other' ? customMistakeType.trim() || null : null,
      question_id:           questionId.trim().toUpperCase() || null,
      student_answer:        studentAnswer !== '__none__' ? studentAnswer as 'A' | 'B' | 'C' | 'D' : null,
      correct_answer:        correctAnswer !== '__none__' ? correctAnswer as 'A' | 'B' | 'C' | 'D' : null,
      description:           description.trim(),
      my_answer:             myAnswer.trim() || null,
      correct_approach:      correctApproach.trim() || null,
      corrected_explanation: correctedExplanation.trim() || null,
      confidence_rating:     confidenceRating,
      college_board_domain:  domainData?.label ?? null,
      college_board_skill:   selectedSkill || null,
    })

    setLoading(false)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Error updated!' })
      onOpenChange(false)
      onSuccess?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Error</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section */}
          <div className="space-y-2">
            <Label>Section</Label>
            <div className="flex gap-2">
              {(['math', 'reading_writing'] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => { setSubject(s); setSelectedDomain(''); setSelectedSkill('') }}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium border transition-colors cursor-pointer',
                    subject === s
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--surface-sunken)]'
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
            <Select value={selectedDomain} onValueChange={v => { setSelectedDomain(v); setSelectedSkill('') }}>
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
              <Select value={selectedSkill || '__none__'} onValueChange={v => setSelectedSkill(v === '__none__' ? '' : v)}>
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
            <Label>Mistake Type</Label>
            <Select value={errorType} onValueChange={v => setErrorType(v as typeof errorType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              8-character identifier from the question bank. Question content is never stored.
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
            <Label>What went wrong? *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} required className="h-20"
              placeholder="Describe the mistake or concept you struggled with…" />
          </div>

          {/* What did you do */}
          <div className="space-y-2">
            <Label>What did you do? <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
            <Textarea value={myAnswer} onChange={e => setMyAnswer(e.target.value)} className="h-14"
              placeholder="Your incorrect reasoning or approach…" />
          </div>

          {/* Correct approach */}
          <div className="space-y-2">
            <Label>Correct approach <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
            <Textarea value={correctApproach} onChange={e => setCorrectApproach(e.target.value)} className="h-14"
              placeholder="The right way to solve this type of problem…" />
          </div>

          {/* Corrected explanation */}
          <div className="space-y-2">
            <Label>Your corrected explanation <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
            <p className="text-xs text-[var(--muted-foreground)]">In your own words — writing it helps it stick.</p>
            <Textarea value={correctedExplanation} onChange={e => setCorrectedExplanation(e.target.value)} className="h-20"
              placeholder="In my own words, the correct approach is…" />
          </div>

          {/* Confidence */}
          <div className="space-y-2">
            <Label>Confidence <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></Label>
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
