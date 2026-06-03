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
import { createQuestionSession } from '@/actions/question-sessions'
import { toggleTaskComplete } from '@/actions/calendar'
import { useToast } from '@/components/ui/use-toast'
import type { CalendarTask } from '@/types'
import type { CollegeBoardFilter } from '@/types'

interface LogSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: CalendarTask
  onSuccess?: () => void
}

export function LogSessionDialog({ open, onOpenChange, task, onSuccess }: LogSessionDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [attempted, setAttempted] = React.useState('')
  const [correct, setCorrect] = React.useState('')
  const { toast } = useToast()

  const filters = task.college_board_filters as CollegeBoardFilter | null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const questionsAttempted = parseInt(attempted, 10)
    const questionsCorrect   = parseInt(correct, 10)

    if (questionsCorrect > questionsAttempted) {
      toast({ title: 'Invalid', description: 'Correct answers cannot exceed attempted.', variant: 'destructive' })
      setLoading(false)
      return
    }

    const fd = new FormData(e.currentTarget)

    const result = await createQuestionSession({
      calendar_task_id:    task.id,
      session_date:        task.task_date,
      subject:             task.subject === 'both' ? 'math' : task.subject,
      category:            task.category ?? '',
      subcategory:         filters?.skill ?? null,
      questions_attempted: questionsAttempted,
      questions_correct:   questionsCorrect,
      time_spent_minutes:  parseInt(fd.get('time_spent') as string, 10) || task.duration_minutes || null,
      college_board_filters: task.college_board_filters,
      notes:               (fd.get('notes') as string) || null,
    })

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
      setLoading(false)
      return
    }

    // Mark the task complete after logging the session
    await toggleTaskComplete(task.id, true)

    toast({
      title: 'Session logged! 📊',
      description: 'Your results have been recorded and your study plan has been updated.',
    })
    setLoading(false)
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Session Results</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium">{task.title}</p>
          {filters?.domain && (
            <p className="text-xs mt-0.5 text-blue-600 dark:text-blue-400">
              {filters.domain}{filters.skill ? ` · ${filters.skill}` : ''}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="attempted">Questions Attempted</Label>
              <Input
                id="attempted"
                type="number"
                min={1}
                max={200}
                value={attempted}
                onChange={e => setAttempted(e.target.value)}
                placeholder="e.g. 20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correct">Questions Correct</Label>
              <Input
                id="correct"
                type="number"
                min={0}
                max={200}
                value={correct}
                onChange={e => setCorrect(e.target.value)}
                placeholder="e.g. 15"
                required
              />
            </div>
          </div>

          {attempted && correct && parseInt(attempted) > 0 && (
            <p className="text-sm text-center font-medium text-emerald-600 dark:text-emerald-400">
              Accuracy: {Math.round((parseInt(correct) / parseInt(attempted)) * 100)}%
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="time_spent">Time Spent (minutes)</Label>
            <Input
              id="time_spent"
              name="time_spent"
              type="number"
              min={1}
              max={300}
              defaultValue={task.duration_minutes ?? ''}
              placeholder="e.g. 45"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-notes">Notes (optional)</Label>
            <Textarea
              id="session-notes"
              name="notes"
              placeholder="What went well? What was confusing? Any patterns noticed?"
              className="h-20"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Complete Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
