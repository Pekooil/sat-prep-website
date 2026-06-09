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
import { addScoreEntry } from '@/actions/score-history'
import { toggleTaskComplete } from '@/actions/calendar'
import { useToast } from '@/components/ui/use-toast'
import type { CalendarTask } from '@/types'

interface PracticeTestScoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: CalendarTask
  onSuccess?: () => void
}

export function PracticeTestScoreDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: PracticeTestScoreDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const mathScore = Number(fd.get('math_score')) || undefined
    const rwScore   = Number(fd.get('reading_writing_score')) || undefined

    if (mathScore && (mathScore < 200 || mathScore > 800)) {
      toast({ title: 'Invalid score', description: 'Math score must be 200–800.', variant: 'destructive' })
      setLoading(false)
      return
    }
    if (rwScore && (rwScore < 200 || rwScore > 800)) {
      toast({ title: 'Invalid score', description: 'R&W score must be 200–800.', variant: 'destructive' })
      setLoading(false)
      return
    }

    const result = await addScoreEntry({
      test_type:             'practice',
      test_date:             task.task_date,
      math_score:            mathScore ?? null,
      reading_writing_score: rwScore ?? null,
      notes:                 (fd.get('notes') as string) || null,
    })

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
      setLoading(false)
      return
    }

    // Mark the practice test task complete
    await toggleTaskComplete(task.id, true)

    const total = (mathScore ?? 0) + (rwScore ?? 0)
    toast({
      title: `Practice test logged! ${total > 0 ? `Score: ${total}` : ''}`,
      description: 'Your score has been recorded and your study plan has been updated.',
    })
    setLoading(false)
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Practice Test Score</DialogTitle>
        </DialogHeader>

        <div className="rounded-[var(--radius)] bg-[var(--accent-soft)] border border-[var(--border)] p-3 text-sm">
          <p className="font-medium text-[var(--text-heading)]">{task.title}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{task.task_date}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pt-math">Math Score</Label>
              <Input
                id="pt-math"
                name="math_score"
                type="number"
                min={200}
                max={800}
                step={10}
                placeholder="200–800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-rw">Reading & Writing</Label>
              <Input
                id="pt-rw"
                name="reading_writing_score"
                type="number"
                min={200}
                max={800}
                step={10}
                placeholder="200–800"
              />
            </div>
          </div>

          <p className="text-xs text-[var(--muted-foreground)]">
            Scores are optional — you can log the test without them and add scores later on the Data page.
          </p>

          <div className="space-y-2">
            <Label htmlFor="pt-notes">Notes (optional)</Label>
            <Textarea
              id="pt-notes"
              name="notes"
              placeholder="How did it feel? Areas to focus on next?"
              className="h-20"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Complete Test
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
