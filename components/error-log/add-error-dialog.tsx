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
import { MATH_DOMAINS, RW_DOMAINS, ERROR_TYPES } from '@/lib/constants'

interface AddErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddErrorDialog({ open, onOpenChange, onSuccess }: AddErrorDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [subject, setSubject] = React.useState<'math' | 'reading_writing'>('math')
  const [selectedDomain, setSelectedDomain] = React.useState('')
  const [selectedSkill, setSelectedSkill] = React.useState('')
  const { toast } = useToast()

  const domains = subject === 'math' ? MATH_DOMAINS : RW_DOMAINS
  const skills = domains.find(d => d.value === selectedDomain)?.skills ?? []

  function resetForm() {
    setSubject('math')
    setSelectedDomain('')
    setSelectedSkill('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const domainData = domains.find(d => d.value === selectedDomain)

    const result = await createErrorLog({
      subject,
      category: domainData?.label ?? selectedDomain ?? 'Other',
      subcategory: selectedSkill || null,
      error_type: fd.get('error_type') as 'concept' | 'careless' | 'time' | 'strategy' | 'other',
      description: fd.get('description') as string,
      my_answer: (fd.get('my_answer') as string) || null,
      correct_approach: (fd.get('correct_approach') as string) || null,
      college_board_domain: domainData?.label ?? null,
      college_board_skill: selectedSkill || null,
    })

    setLoading(false)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Error logged!', description: 'Keep track and you\'ll master it soon.' })
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
          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <div className="flex gap-2">
              {(['math', 'reading_writing'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSubject(s); setSelectedDomain(''); setSelectedSkill('') }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                    subject === s
                      ? s === 'math'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-violet-600 text-white border-violet-600'
                      : 'border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {s === 'math' ? 'Math' : 'Reading & Writing'}
                </button>
              ))}
            </div>
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label>Domain (College Board Category)</Label>
            <Select onValueChange={v => { setSelectedDomain(v); setSelectedSkill('') }}>
              <SelectTrigger>
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skill */}
          {skills.length > 0 && (
            <div className="space-y-2">
              <Label>Specific Skill</Label>
              <Select onValueChange={setSelectedSkill}>
                <SelectTrigger>
                  <SelectValue placeholder="Select skill (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {skills.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error type */}
          <div className="space-y-2">
            <Label>Error Type</Label>
            <Select name="error_type" required>
              <SelectTrigger>
                <SelectValue placeholder="What kind of error?" />
              </SelectTrigger>
              <SelectContent>
                {ERROR_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="error-desc">What went wrong? *</Label>
            <Textarea
              id="error-desc"
              name="description"
              placeholder="Describe the mistake or concept you struggled with…"
              required
              className="h-20"
            />
          </div>

          {/* My answer */}
          <div className="space-y-2">
            <Label htmlFor="my-answer">What did you do? (optional)</Label>
            <Input
              id="my-answer"
              name="my_answer"
              placeholder="Your incorrect reasoning or approach…"
            />
          </div>

          {/* Correct approach */}
          <div className="space-y-2">
            <Label htmlFor="correct-approach">Correct approach (optional)</Label>
            <Textarea
              id="correct-approach"
              name="correct_approach"
              placeholder="The right way to solve this type of problem…"
              className="h-16"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Error
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
