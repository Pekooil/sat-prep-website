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
import { addScoreEntry } from '@/actions/score-history'
import { useToast } from '@/components/ui/use-toast'
import { TEST_TYPES } from '@/lib/constants'
import type { ScoreHistory } from '@/types'

interface AddScoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (score: ScoreHistory) => void
}

export function AddScoreDialog({ open, onOpenChange, onSuccess }: AddScoreDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const mathScore = Number(fd.get('math_score')) || undefined
    const rwScore = Number(fd.get('reading_writing_score')) || undefined

    const result = await addScoreEntry({
      test_type: fd.get('test_type') as 'diagnostic' | 'practice' | 'official' | 'full_length',
      test_date: fd.get('test_date') as string,
      math_score: mathScore ?? null,
      reading_writing_score: rwScore ?? null,
      notes: (fd.get('notes') as string) || null,
    })

    setLoading(false)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Score logged!', description: 'Your progress has been recorded.' })
      onOpenChange(false)
      // Reload will happen via revalidatePath
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log a Score</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Test Type</Label>
            <Select name="test_type" required>
              <SelectTrigger>
                <SelectValue placeholder="Select test type" />
              </SelectTrigger>
              <SelectContent>
                {TEST_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="score-date">Test Date</Label>
            <Input
              id="score-date"
              name="test_date"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="math-score">Math Score</Label>
              <Input
                id="math-score"
                name="math_score"
                type="number"
                min={200}
                max={800}
                step={10}
                placeholder="200–800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rw-score">Reading & Writing</Label>
              <Input
                id="rw-score"
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
            Total score = Math + Reading & Writing (max 1600)
          </p>

          <div className="space-y-2">
            <Label htmlFor="score-notes">Notes (optional)</Label>
            <Textarea
              id="score-notes"
              name="notes"
              placeholder="How did it go? What to focus on next?"
              className="h-16"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Score
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
