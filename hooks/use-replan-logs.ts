'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReplanAuditLog } from '@/types'

/**
 * Fetches replan_audit_logs directly from the browser Supabase client on
 * every mount, bypassing Next.js's client-side router cache.
 *
 * This is necessary because the adaptive replanner writes new audit rows
 * during a Server Action (createQuestionSession → runAdaptiveReplanner).
 * Without a client-side fetch, the ReplanTimeline and WorkloadRedistribution
 * charts would show stale data until the user performed a hard refresh.
 *
 * @param initial   Server-rendered seed data (shown immediately, then
 *                  replaced with the fresh client fetch).
 */
export function useReplanLogs(initial: ReplanAuditLog[] = []) {
  const [replans, setReplans]   = React.useState<ReplanAuditLog[]>(initial)
  const [loading, setLoading]   = React.useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = React.useMemo(() => createClient(), [])

  const reload = React.useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('replan_audit_logs')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setReplans(data as ReplanAuditLog[])
    setLoading(false)
  }, [supabase])

  // Re-fetch on mount so fresh rows from a just-completed session are visible
  React.useEffect(() => { reload() }, [reload])

  return { replans, loading, reload }
}
