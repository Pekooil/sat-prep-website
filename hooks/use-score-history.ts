'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ScoreHistory, ScoreChartPoint } from '@/types'

export function useScoreHistory() {
  const [scores, setScores] = React.useState<ScoreHistory[]>([])
  const [loading, setLoading] = React.useState(true)
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('score_history')
        .select('*')
        .order('test_date', { ascending: true })
      setScores(data ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const chartData: ScoreChartPoint[] = scores.map(s => ({
    date: s.test_date,
    total: s.total_score ?? (s.math_score ?? 0) + (s.reading_writing_score ?? 0),
    math: s.math_score,
    readingWriting: s.reading_writing_score,
    testType: s.test_type,
  }))

  const latestScore = scores.at(-1)

  return { scores, chartData, latestScore, loading }
}
