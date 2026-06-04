/**
 * POST /api/reminders/daily
 *
 * Called hourly by Vercel Cron (see vercel.json).
 * For each user whose preferred reminder time falls within the current
 * hour in their configured timezone, this endpoint:
 *   1. Creates in-app notification rows (if inapp_reminders_enabled)
 *   2. Sends an email digest via Resend (if email_reminders_enabled)
 *
 * Security: requires Authorization: Bearer <CRON_SECRET> header.
 *
 * Setup checklist:
 *   - Add SUPABASE_SERVICE_ROLE_KEY  → Supabase project → Settings → API
 *   - Add RESEND_API_KEY             → https://resend.com → API Keys
 *   - Add RESEND_FROM_EMAIL          → e.g. "SAT Planner <noreply@yourdomain.com>"
 *   - Add NEXT_PUBLIC_APP_URL        → e.g. "https://your-app.vercel.app"
 *   - Add CRON_SECRET                → any random string (used to protect this route)
 */

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildReminderEmail, type ReminderTask } from '@/lib/email/reminder-template'

// ─── Types ────────────────────────────────────────────────────────────────────

type PrefRow = {
  user_id: string
  email_reminders_enabled: boolean
  inapp_reminders_enabled: boolean
  daily_assignment_reminder: boolean
  overdue_reminder: boolean
  practice_test_reminder: boolean
  reminder_time: string   // "HH:MM:SS"
  timezone: string
}

type UserRow = {
  id: string
  email: string | null
  full_name: string | null
}

type TaskRow = {
  id: string
  title: string
  task_date: string
  duration_minutes: number | null
  category: string | null
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app.vercel.app'
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'SAT Planner <noreply@example.com>'
  const resendKey = process.env.RESEND_API_KEY
  const resend = resendKey ? new Resend(resendKey) : null

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  // ── Load all notification preferences ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allPrefs, error: prefsErr } = await (supabase.from('notification_preferences') as any)
    .select('user_id, email_reminders_enabled, inapp_reminders_enabled, daily_assignment_reminder, overdue_reminder, practice_test_reminder, reminder_time, timezone')

  if (prefsErr || !allPrefs) {
    return NextResponse.json(
      { error: 'Failed to load preferences', detail: prefsErr?.message },
      { status: 500 },
    )
  }

  const now = new Date()
  const processed: string[] = []
  const skipped: string[] = []

  for (const pref of allPrefs as PrefRow[]) {
    // Skip users who disabled all channels
    if (!pref.email_reminders_enabled && !pref.inapp_reminders_enabled) {
      skipped.push(pref.user_id)
      continue
    }

    // ── Check if it's the user's reminder hour ──────────────────────────────
    let userHour: number
    let userMinute: number
    try {
      // en-CA gives "YYYY-MM-DD HH:MM:SS" format — use to extract local time
      const localStr = now.toLocaleString('en-US', {
        timeZone: pref.timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      })
      const [h, m] = localStr.split(':').map(Number)
      userHour = h
      userMinute = m
    } catch {
      // Invalid timezone — skip
      skipped.push(pref.user_id)
      continue
    }

    const [prefHour, prefMinute] = pref.reminder_time.split(':').map(Number)

    // Fire within the first 10 minutes of the configured hour
    if (userHour !== prefHour || userMinute > 10) {
      skipped.push(pref.user_id)
      continue
    }

    // ── User's local "today" date ──────────────────────────────────────────
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: pref.timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now)   // → "YYYY-MM-DD"

    const sevenDays = new Intl.DateTimeFormat('en-CA', {
      timeZone: pref.timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(+now + 7 * 86_400_000))

    // ── Fetch tasks ────────────────────────────────────────────────────────
    const [
      { data: todayRaw },
      { data: overdueRaw },
      { data: testsRaw },
    ] = await Promise.all([
      pref.daily_assignment_reminder
        ? supabase
            .from('calendar_tasks')
            .select('id, title, task_date, duration_minutes, category')
            .eq('user_id', pref.user_id)
            .eq('task_date', localDate)
            .eq('is_completed', false)
        : Promise.resolve({ data: [] as TaskRow[] }),

      pref.overdue_reminder
        ? supabase
            .from('calendar_tasks')
            .select('id, title, task_date, duration_minutes, category')
            .eq('user_id', pref.user_id)
            .lt('task_date', localDate)
            .eq('is_completed', false)
            .order('task_date', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [] as TaskRow[] }),

      pref.practice_test_reminder
        ? supabase
            .from('calendar_tasks')
            .select('id, title, task_date, duration_minutes, category')
            .eq('user_id', pref.user_id)
            .eq('category', 'Full Practice Test')
            .eq('is_completed', false)
            .gte('task_date', localDate)
            .lte('task_date', sevenDays)
            .order('task_date', { ascending: true })
        : Promise.resolve({ data: [] as TaskRow[] }),
    ])

    const todayTasks   = (todayRaw  ?? []) as ReminderTask[]
    const overdueTasks = (overdueRaw ?? []) as ReminderTask[]
    const upcomingTests = (testsRaw ?? []) as ReminderTask[]

    // Nothing to notify about? Skip this user
    if (todayTasks.length + overdueTasks.length + upcomingTests.length === 0) {
      skipped.push(pref.user_id)
      continue
    }

    // ── In-app notifications ──────────────────────────────────────────────
    if (pref.inapp_reminders_enabled) {
      const notifs: {
        user_id: string
        title: string
        message: string
        type: 'reminder'
        link: string
        is_read: boolean
      }[] = []

      if (todayTasks.length > 0) {
        notifs.push({
          user_id: pref.user_id,
          title: `📅 ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today`,
          message:
            todayTasks.slice(0, 3).map(t => t.title).join(', ') +
            (todayTasks.length > 3 ? ` +${todayTasks.length - 3} more` : ''),
          type: 'reminder',
          link: '/calendar',
          is_read: false,
        })
      }

      if (overdueTasks.length > 0) {
        notifs.push({
          user_id: pref.user_id,
          title: `⚠️ ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
          message: 'You have incomplete tasks from previous days. Open the calendar to catch up.',
          type: 'reminder',
          link: '/calendar',
          is_read: false,
        })
      }

      if (upcomingTests.length > 0) {
        const next = upcomingTests[0]
        const dateStr = new Date(next.task_date + 'T12:00:00Z').toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        })
        notifs.push({
          user_id: pref.user_id,
          title: '📝 Practice test coming up',
          message: `${next.title} · ${dateStr}`,
          type: 'reminder',
          link: '/calendar',
          is_read: false,
        })
      }

      if (notifs.length > 0) {
        await supabase.from('notifications').insert(notifs)
      }
    }

    // ── Email ──────────────────────────────────────────────────────────────
    if (pref.email_reminders_enabled && resend) {
      // Fetch user email + name
      const { data: userRow } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', pref.user_id)
        .single()

      const u = userRow as UserRow | null
      if (u?.email) {
        const firstName = u.full_name?.split(' ')[0] ?? 'Student'
        const { subject, html } = buildReminderEmail({
          firstName,
          todayTasks,
          overdueTasks,
          upcomingTests,
          appUrl,
        })

        try {
          await resend.emails.send({ from: fromEmail, to: u.email, subject, html })
        } catch (emailErr) {
          console.error('[reminders/daily] email error:', emailErr)
        }
      }
    }

    processed.push(pref.user_id)
  }

  return NextResponse.json({
    ok: true,
    processedAt: now.toISOString(),
    processed: processed.length,
    skipped: skipped.length,
  })
}

// Allow GET for quick health-check / manual trigger test from the browser
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Daily reminders endpoint is live. Send POST with Authorization header to trigger.',
  })
}
