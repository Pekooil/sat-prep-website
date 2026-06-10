'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function ConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = React.useState<'loading' | 'error'>('loading')
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setMessage(error.message)
        setStatus('error')
        return
      }
      if (session) {
        router.replace('/home')
      } else {
        setMessage('No session found. The link may have expired.')
        setStatus('error')
      }
    })
  }, [router])

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
          <a href="/login" className="text-sm font-medium text-violet-600 hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
    </div>
  )
}
