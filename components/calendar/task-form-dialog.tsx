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
import { createCalendarTask } from '@/actions/calendar'
import { useToast } from '@/components/ui/use-toast'
import { MATH_DOMAINS, RW_DOMAINS } from '@/lib/constants'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: string
  onSuccess?: () => void
}

export function TaskFormDialog({ open, onOpenChange, defaultDate, onSuccess }: TaskFormDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [subject, setSubject] = React.useState<'math' | 'reading_writing' | 'both'>('math')
  const [selectedDomain, setSelectedDomain] = React.useState('')
  const { toast } = useToast()

  const domains = subject === 'math' ? MATH_DOMAINS : subject === 'reading_writing' ? RW_DOMAINS : []
  const domainSkills = domains.find(d => d.value === selectedDomain)?.skills ?? []

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const domainLabel = domains.find(d => d.value === fd.get('domain'))?.label
    const skill = fd.get('skill') as string

    const result = await createCalendarTask({
      title: fd.get('title') as string,
      description: fd.get('description') as string || null,
      task_date: fd.get('task_date') as string,
      duration_minutes: Number(fd.get('duration_minutes')) || 60,
      subject,
      category: domainLabel ?? (fd.get('domain') as string) ?? null,
      college_board_filters: domainLabel
        ? { domain: domainLabel, skill: skill || undefined, difficulty: (fd.get('difficulty') as string) || undefined }
        : null,
    })

    setLoading(false)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Task added!', description: 'Your study task has been scheduled.' })
      onOpenChange(false)
      onSuccess?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Study Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input id="task-title" name="title" placeholder="e.g. Algebra practice" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="task-date">Date</Label>
              <Input id="task-date" name="task_date" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input id="duration" name="duration_minutes" type="number" min={5} max={480} defaultValue={60} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <div className="flex gap-2">
              {(['math', 'reading_writing', 'both'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSubject(s); setSelectedDomain('') }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    subject === s
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {s === 'math' ? 'Math' : s === 'reading_writing' ? 'Reading & Writing' : 'Both'}
                </button>
              ))}
            </div>
          </div>

          {subject !== 'both' && (
            <>
              <div className="space-y-2">
                <Label>Domain / Category</Label>
                <Select name="domain" onValueChange={setSelectedDomain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {domainSkills.length > 0 && (
                <div className="space-y-2">
                  <Label>Skill (College Board QB Filter)</Label>
                  <Select name="skill">
                    <SelectTrigger>
                      <SelectValue placeholder="Select skill (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {domainSkills.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Difficulty (QB Filter)</Label>
                <Select name="difficulty">
                  <SelectTrigger>
                    <SelectValue placeholder="Any difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="task-desc">Notes (optional)</Label>
            <Textarea id="task-desc" name="description" placeholder="What you plan to focus on…" className="h-20" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
