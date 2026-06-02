'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScoreTimeline } from './score-timeline'
import { AccuracyChart } from './accuracy-chart'
import { StatsCards } from './stats-cards'
import { AddScoreDialog } from './add-score-dialog'
import { CategoryStats } from './category-stats'
import type { QuestionSession, ScoreHistory } from '@/types'

type ErrorSummary = {
  subject: 'math' | 'reading_writing'
  category: string
  error_type: string
  mastered: boolean
}

interface DataClientProps {
  scores: ScoreHistory[]
  sessions: QuestionSession[]
  errors: ErrorSummary[]
}

export function DataClient({ scores, sessions, errors }: DataClientProps) {
  const [scoreData, setScoreData] = React.useState<ScoreHistory[]>(scores)
  const [addScoreOpen, setAddScoreOpen] = React.useState(false)

  const totalAttempted = sessions.reduce((s, q) => s + (q.questions_attempted ?? 0), 0)
  const totalCorrect = sessions.reduce((s, q) => s + (q.questions_correct ?? 0), 0)
  const totalMinutes = sessions.reduce((s, q) => s + (q.time_spent_minutes ?? 0), 0)
  const unmasteredErrors = errors.filter(e => !e.mastered).length
  const masteredErrors = errors.filter(e => e.mastered).length

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <StatsCards
        totalMinutes={totalMinutes}
        totalAttempted={totalAttempted}
        totalCorrect={totalCorrect}
        unmasteredErrors={unmasteredErrors}
        masteredErrors={masteredErrors}
        latestScore={scoreData.at(-1)?.total_score ?? null}
      />

      {/* Add Score button */}
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setAddScoreOpen(true)}>
          <Plus className="h-4 w-4" />
          Log Score
        </Button>
      </div>

      {/* Charts */}
      <Tabs defaultValue="scores">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-grid">
          <TabsTrigger value="scores">Score History</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="mt-4">
          <ScoreTimeline scores={scoreData} />
        </TabsContent>

        <TabsContent value="accuracy" className="mt-4">
          <AccuracyChart sessions={sessions} />
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoryStats errors={errors} sessions={sessions} />
        </TabsContent>
      </Tabs>

      <AddScoreDialog
        open={addScoreOpen}
        onOpenChange={setAddScoreOpen}
        onSuccess={() => {
          // revalidatePath in the action will refresh the server data on next navigation
          setAddScoreOpen(false)
        }}
      />
    </div>
  )
}
