'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPrefsInput {
  email_reminders_enabled: boolean
  inapp_reminders_enabled: boolean
  daily_assignment_reminder: boolean
  overdue_reminder: boolean
  practice_test_reminder: boolean
  /** "HH:MM" format — stored as "HH:MM:SS" in Postgres TIME */
  reminder_time: string
  timezone: string
}

const DEFAULTS: NotificationPrefsInput = {
  email_reminders_enabled: true,
  inapp_reminders_enabled: true,
  daily_assignment_reminder: true,
  overdue_reminder: true,
  practice_test_reminder: true,
  reminder_time: '08:00',
  timezone: 'America/New_York',
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Fetch the current user's notification preferences.
 * Returns DEFAULTS if no row exists yet (first-time users).
 */
export async function getNotificationPreferences(): Promise<{
  data: NotificationPrefsInput
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: DEFAULTS, error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('notification_preferences') as any)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return { data: DEFAULTS, error: null }

  return {
    data: {
      email_reminders_enabled: data.email_reminders_enabled ?? true,
      inapp_reminders_enabled: data.inapp_reminders_enabled ?? true,
      daily_assignment_reminder: data.daily_assignment_reminder ?? true,
      overdue_reminder: data.overdue_reminder ?? true,
      practice_test_reminder: data.practice_test_reminder ?? true,
      // Postgres TIME comes back as "HH:MM:SS" — trim to "HH:MM" for <input type="time">
      reminder_time: (data.reminder_time as string)?.slice(0, 5) ?? '08:00',
      timezone: data.timezone ?? 'America/New_York',
    },
    error: null,
  }
}

/**
 * Upsert the current user's notification preferences.
 */
export async function saveNotificationPreferences(
  prefs: NotificationPrefsInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notification_preferences') as any).upsert(
    {
      user_id: user.id,
      email_reminders_enabled: prefs.email_reminders_enabled,
      inapp_reminders_enabled: prefs.inapp_reminders_enabled,
      daily_assignment_reminder: prefs.daily_assignment_reminder,
      overdue_reminder: prefs.overdue_reminder,
      practice_test_reminder: prefs.practice_test_reminder,
      // Store as "HH:MM:SS" so Postgres accepts it as a TIME literal
      reminder_time: prefs.reminder_time.length === 5
        ? prefs.reminder_time + ':00'
        : prefs.reminder_time,
      timezone: prefs.timezone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { error: null }
}

/**
 * Immediately generate and deliver in-app (and optionally email) reminders
 * for the current user.  Used by the "Send test reminder" button.
 */
export async function sendTestReminder(): Promise<{
  todayCount: number
  overdueCount: number
  testCount: number
  notifCreated: number
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { todayCount: 0, overdueCount: 0, testCount: 0, notifCreated: 0, error: 'Unauthorized' }

  const today = new Date().toISOString().split('T')[0]
  const sevenDays = new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0]

  const [{ data: todayTasks }, { data: overdueTasks }, { data: upcomingTests }] =
    await Promise.all([
      supabase
        .from('calendar_tasks')
        .select('id, title, task_date, duration_minutes')
        .eq('user_id', user.id)
        .eq('task_date', today)
        .eq('is_completed', false),
      supabase
        .from('calendar_tasks')
        .select('id, title, task_date, duration_minutes')
        .eq('user_id', user.id)
        .lt('task_date', today)
        .eq('is_completed', false)
        .order('task_date', { ascending: false })
        .limit(5),
      supabase
        .from('calendar_tasks')
        .select('id, title, task_date, duration_minutes')
        .eq('user_id', user.id)
        .eq('category', 'Full Practice Test')
        .eq('is_completed', false)
        .gte('task_date', today)
        .lte('task_date', sevenDays)
        .order('task_date', { ascending: true }),
    ])

  const today_ = todayTasks ?? []
  const overdue_ = overdueTasks ?? []
  const tests_ = upcomingTests ?? []

  const notifications: {
    user_id: string
    title: string
    message: string
    type: 'reminder'
    link: string
    is_read: boolean
  }[] = []

  if (today_.length > 0) {
    notifications.push({
      user_id: user.id,
      title: `📅 ${today_.length} task${today_.length > 1 ? 's' : ''} due today`,
      message:
        today_.slice(0, 3).map((t) => t.title).join(', ') +
        (today_.length > 3 ? ` +${today_.length - 3} more` : ''),
      type: 'reminder',
      link: '/calendar',
      is_read: false,
    })
  }

  if (overdue_.length > 0) {
    notifications.push({
      user_id: user.id,
      title: `⚠️ ${overdue_.length} overdue task${overdue_.length > 1 ? 's' : ''}`,
      message: "You have incomplete tasks from previous days. Open the calendar to catch up.",
      type: 'reminder',
      link: '/calendar',
      is_read: false,
    })
  }

  if (tests_.length > 0) {
    const next = tests_[0]
    const dateStr = new Date(next.task_date + 'T12:00:00Z').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    })
    notifications.push({
      user_id: user.id,
      title: '📝 Practice test coming up',
      message: `${next.title} · ${dateStr}`,
      type: 'reminder',
      link: '/calendar',
      is_read: false,
    })
  }

  if (notifications.length === 0) {
    return { todayCount: 0, overdueCount: 0, testCount: 0, notifCreated: 0, error: null }
  }

  const { error: insertErr } = await supabase.from('notifications').insert(notifications)
  if (insertErr) return { todayCount: today_.length, overdueCount: overdue_.length, testCount: tests_.length, notifCreated: 0, error: insertErr.message }

  revalidatePath('/home')
  return {
    todayCount: today_.length,
    overdueCount: overdue_.length,
    testCount: tests_.length,
    notifCreated: notifications.length,
    error: null,
  }
}
