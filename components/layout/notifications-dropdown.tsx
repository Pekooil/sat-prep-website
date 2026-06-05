'use client'

import * as React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'
import { formatShortDate } from '@/lib/utils'

interface NotificationsDropdownProps {
  userId?: string
}

export function NotificationsDropdown({ userId }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  // Stable client reference — createClient() must not be called on every render
  const supabase = React.useMemo(() => createClient(), [])

  const loadNotifications = React.useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }, [userId, supabase])

  React.useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const markAllRead = React.useCallback(async () => {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [userId, supabase])

  const typeIcon: Record<string, string> = {
    reminder: '⏰',
    achievement: '🏆',
    system: '🔔',
    ai_suggestion: '🤖',
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-normal"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-[var(--muted-foreground)]">
            No notifications yet
          </div>
        ) : (
          notifications.map(n => (
            <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-3">
              <div className="flex w-full items-start gap-2">
                <span className="text-base">{typeIcon[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${!n.is_read ? '' : 'text-[var(--muted-foreground)]'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{n.message}</p>
                </div>
                {!n.is_read && (
                  <span className="h-2 w-2 rounded-full bg-violet-500 mt-1 shrink-0" />
                )}
              </div>
              <span className="text-[10px] text-[var(--muted-foreground)] ml-6">
                {formatShortDate(n.created_at)}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
