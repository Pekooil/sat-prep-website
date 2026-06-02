'use client'

import * as React from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { generateAIStudyPlan } from '@/actions/ai-planner'
import { useToast } from '@/components/ui/use-toast'
import { MATH_DOMAINS, RW_DOMAINS } from '@/lib/constants'
import type { User } from '@/types'

interface AIPlannerTriggerProps {
  profile: User | null
}

const weakAreaOptions = [
  ...MATH_DOMAINS.map(d => ({ label: d.label, value: d.value, subject: 'math' })),
  ...RW_DOMAINS.map(d => ({ label: d.label, value: d.value, subject: 'rw' })),
]

export function AIPlannerTrigger({ profile }: AIPlannerTriggerProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [weakAreas, setWeakAreas] = React.useState<string[]>([])
  const { toast } = useToast()

  const defaultCurrent = profile?.current_score ?? 1100
  const defaultTarget = profile?.target_score ?? 1400
  const defaultDate = profile?.test_date ?? ''
  const defaultHours = profile?.study_hours_per_week ?? 10

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const result = await generateAIStudyPlan({
      currentScore: Number(fd.get('current_score')),
      targetScore: Number(fd.get('target_score')),
      testDate: fd.get('test_date') as string,
      hoursPerWeek: Number(fd.get('hours_per_week')),
      weakAreas,
    })

    setLoading(false)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      setSuccess(true)
      setExpanded(false)
      toast({
        title: 'Study plan generated! 🎉',
        description: 'Your personalized plan has been added to the calendar.',
        variant: 'success' as never,
      })
    }
  }

  function toggleWeakArea(value: string) {
    setWeakAreas(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-[var(--card)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          AI Study Plan Generator
        </CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">
          Get a personalized week-by-week plan with College Board practice recommendations.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {success && !expanded ? (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">✅ Plan created!</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Check your Calendar tab.</p>
            <button
              className="text-xs text-emerald-700 dark:text-emerald-400 underline mt-2"
              onClick={() => { setSuccess(false); setExpanded(true) }}
            >
              Generate a new plan
            </button>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              className="w-full justify-between text-sm border-blue-200 dark:border-blue-800"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide options' : 'Configure & generate plan'}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {expanded && (
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="current_score">Current Score</Label>
                    <Input
                      id="current_score"
                      name="current_score"
                      type="number"
                      min={400}
                      max={1600}
                      step={10}
                      defaultValue={defaultCurrent}
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="target_score">Target Score</Label>
                    <Input
                      id="target_score"
                      name="target_score"
                      type="number"
                      min={400}
                      max={1600}
                      step={10}
                      defaultValue={defaultTarget}
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="test_date">Test Date</Label>
                    <Input
                      id="test_date"
                      name="test_date"
                      type="date"
                      defaultValue={defaultDate}
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="hours_per_week">Hours/Week</Label>
                    <Input
                      id="hours_per_week"
                      name="hours_per_week"
                      type="number"
                      min={1}
                      max={40}
                      defaultValue={defaultHours}
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Weak Areas (select all that apply)</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {weakAreaOptions.map(opt => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`wa-${opt.value}`}
                          checked={weakAreas.includes(opt.value)}
                          onCheckedChange={() => toggleWeakArea(opt.value)}
                        />
                        <label htmlFor={`wa-${opt.value}`} className="text-xs cursor-pointer">
                          <span className={`font-medium ${opt.subject === 'math' ? 'text-blue-600 dark:text-blue-400' : 'text-violet-600 dark:text-violet-400'}`}>
                            {opt.subject === 'math' ? 'Math' : 'R&W'}
                          </span>
                          {' '}{opt.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating plan…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate AI Plan
                    </>
                  )}
                </Button>

                <p className="text-[10px] text-[var(--muted-foreground)] text-center leading-relaxed">
                  This generates a College Board Question Bank filter guide only. No questions are stored or displayed.
                </p>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
