'use client'

import * as React from 'react'
import { Bell, Clock, Trophy, Radio, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'
import { formatShortDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

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

  type NotifType = 'reminder' | 'achievement' | 'system' | 'ai_suggestion'

  const TYPE_CONFIG: Record<NotifType, { icon: React.ElementType; bg: string; text: string }> = {
    reminder:     { icon: Clock,    bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-600 dark:text-blue-400' },
    achievement:  { icon: Trophy,   bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    system:       { icon: Radio,    bg: 'bg-slate-100 dark:bg-slate-800',    text: 'text-slate-500 dark:text-slate-400' },
    ai_suggestion:{ icon: Bot,      bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
  }

  function getTypeConfig(type: string) {
    return TYPE_CONFIG[type as NotifType] ?? TYPE_CONFIG.system
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[var(--surface-raised)]">
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
              className="text-xs text-[var(--accent)] hover:underline font-normal"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-2">
              <Bell className="h-4 w-4 text-[var(--muted-foreground)]" />
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const cfg = getTypeConfig(n.type)
            const NotifIcon = cfg.icon
            return (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2.5 cursor-default">
                <div className="flex w-full items-start gap-2.5">
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5', cfg.bg)}>
                    <NotifIcon className={cn('h-3.5 w-3.5', cfg.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium leading-tight',
                      n.is_read && 'text-[var(--muted-foreground)] font-normal',
                    )}>
                      {n.title}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  {!n.is_read && (
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                  )}
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)] ml-9.5">
                  {formatShortDate(n.created_at)}
                </span>
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
