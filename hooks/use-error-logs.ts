'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ErrorLog } from '@/types'

interface Filters {
  subject?: string
  category?: string
  error_type?: string
  mastered?: boolean | null
}

export function useErrorLogs(initialFilters: Filters = {}) {
  const [errors, setErrors] = React.useState<ErrorLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filters, setFilters] = React.useState<Filters>(initialFilters)
  const supabase = createClient()

  const load = React.useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.subject) query = query.eq('subject', filters.subject as 'math' | 'reading_writing')
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.error_type) query = query.eq('error_type', filters.error_type as 'concept' | 'careless' | 'time' | 'strategy' | 'other')
    if (filters.mastered !== null && filters.mastered !== undefined) {
      query = query.eq('mastered', filters.mastered)
    }

    const { data } = await query
    setErrors(data ?? [])
    setLoading(false)
  }, [filters])

  React.useEffect(() => { load() }, [load])

  return { errors, loading, filters, setFilters, reload: load }
}
