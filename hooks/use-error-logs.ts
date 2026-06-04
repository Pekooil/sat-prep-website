'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ErrorLog } from '@/types'

export function useErrorLogs() {
  const [errors, setErrors] = React.useState<ErrorLog[]>([])
  const [loading, setLoading] = React.useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = React.useMemo(() => createClient(), [])

  const reload = React.useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
    setErrors((data ?? []) as ErrorLog[])
    setLoading(false)
  }, [supabase])

  React.useEffect(() => { reload() }, [reload])

  return { errors, loading, reload }
}
