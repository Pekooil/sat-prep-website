/**
 * POST /api/reminders/daily
 *
 * Called once per day by Vercel Cron at 0 13 * * * UTC (= 8 AM US Eastern).
 * See vercel.json.  To shift the time for a different timezone, change the
 * cron schedule in vercel.json:
 *   8 AM Pacific  →  "0 16 * * *"
 *   8 AM UTC      →  "0 8  * * *"
 *   8 AM IST      →  "30 2 * * *"
 *
 * For each real user (non-anonymous, has email) with at least one task:
 *   1. Creates in-app notification rows (if inapp_reminders_enabled)
 *   2. Sends an email digest via Resend   (if email_reminders_enabled)
 *
 * Users who have never saved notification preferences are treated as having
 * all reminders enabled (America/New_York timezone default). They can opt
 * out any time via /settings.
 *
 * The user's timezone preference is used to compute their local "today" date
 * so that task queries return the right day regardless of when the cron fires.
 *
 * Security: requires Authorization: Bearer <CRON_SECRET> header.
 * Vercel automatically adds this header when CRON_SECRET is set as an env var.
 *
 * Required env vars:
 *   SUPABASE_SERVICE_ROLE_KEY  — Supabase → Settings → API → service_role
 *   RESEND_API_KEY             — resend.com → API Keys
 *   RESEND_FROM_EMAIL          — verified sender, e.g. "SaturnPath <noreply@yourdomain.com>"
 *   NEXT_PUBLIC_APP_URL        — your deployed URL
 *   CRON_SECRET                — any random string; Vercel injects it as the Bearer token
 */

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildReminderEmail, type ReminderTask } from '@/lib/email/reminder-template'

export const runtime    = 'nodejs'
export const maxDuration = 300

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PrefRow = {
  user_id: string
  email_reminders_enabled: boolean
  inapp_reminders_enabled: boolean
  daily_assignment_reminder: boolean
  overdue_reminder: boolean
  practice_test_reminder: boolean
  timezone: string
}

type UserRow = {
  id: string
  email: string
  full_name: string | null
}

type PrefValues = Omit<PrefRow, 'user_id'>

// Default preferences for users who haven't visited Settings yet.
// All channels enabled, Eastern time.
const DEFAULT_PREFS: PrefValues = {
  email_reminders_enabled:   true,
  inapp_reminders_enabled:   true,
  daily_assignment_reminder: true,
  overdue_reminder:          true,
  practice_test_reminder:    true,
  timezone:                  'America/New_York',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDate(timezone: string, base: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(base)
  } catch {
    return base.toISOString().split('T')[0]
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── Auth guard (fail CLOSED) ────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[reminders/daily] CRON_SECRET is not set — refusing to run.')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  if (!isAuthorized(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const fromEmail = process.env.RESEND_FROM_EMAIL   ?? 'SaturnPath <onboarding@resend.dev>'
  const resendKey = process.env.RESEND_API_KEY
  const resend    = resendKey ? new Resend(resendKey) : null

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  // ── Load all real users (non-anonymous, must have an email address) ─────────
  const { data: allUsers, error: usersErr } = await supabase
    .from('users')
    .select('id, email, full_name')
    .not('email', 'is', null)
    .neq('email', '')

  if (usersErr) {
    return NextResponse.json(
      { error: 'Failed to load users', detail: usersErr.message },
      { status: 500 },
    )
  }
  if (!allUsers || allUsers.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, skipped: 0 })
  }

  // ── Load all notification preferences into a lookup map ────────────────────
  // Users without a row get DEFAULT_PREFS (all reminders on, Eastern time).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allPrefsRaw } = await (supabase.from('notification_preferences') as any)
    .select('user_id, email_reminders_enabled, inapp_reminders_enabled, daily_assignment_reminder, overdue_reminder, practice_test_reminder, timezone')

  const prefsMap = new Map<string, PrefValues>(
    ((allPrefsRaw ?? []) as PrefRow[]).map(p => [p.user_id, p])
  )

  const now = new Date()
  let processed = 0
  let skipped   = 0

  for (const u of allUsers as UserRow[]) {
    const pref = prefsMap.get(u.id) ?? DEFAULT_PREFS

    // Skip users who have explicitly disabled all channels
    if (!pref.email_reminders_enabled && !pref.inapp_reminders_enabled) {
      skipped++
      continue
    }

    // ── Compute the user's local "today" ───────────────────────────────────
    const today     = localDate(pref.timezone, now)
    const sevenDays = localDate(pref.timezone, new Date(+now + 7 * 86_400_000))

    // ── Fetch task buckets in parallel ─────────────────────────────────────
    const [
      { data: todayRaw },
      { data: overdueRaw },
      { data: testsRaw },
    ] = await Promise.all([
      pref.daily_assignment_reminder
        ? supabase
            .from('calendar_tasks')
            .select('id, title, task_date, duration_minutes, category')
            .eq('user_id', u.id)
            .eq('task_date', today)
            .eq('is_completed', false)
        : Promise.resolve({ data: [] }),

      pref.overdue_reminder
        ? supabase
            .from('calendar_tasks')
            .select('id, title, task_date, duration_minutes, category')
            .eq('user_id', u.id)
            .lt('task_date', today)
            .eq('is_completed', false)
            .order('task_date', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [] }),

      pref.practice_test_reminder
        ? supabase
            .from('calendar_tasks')
            .select('id, title, task_date, duration_minutes, category')
            .eq('user_id', u.id)
            .eq('category', 'Full Practice Test')
            .eq('is_completed', false)
            .gte('task_date', today)
            .lte('task_date', sevenDays)
            .order('task_date', { ascending: true })
        : Promise.resolve({ data: [] }),
    ])

    const todayTasks    = (todayRaw   ?? []) as ReminderTask[]
    const overdueTasks  = (overdueRaw ?? []) as ReminderTask[]
    const upcomingTests = (testsRaw   ?? []) as ReminderTask[]

    // Nothing to notify about — skip quietly
    if (todayTasks.length + overdueTasks.length + upcomingTests.length === 0) {
      skipped++
      continue
    }

    // ── In-app notifications ────────────────────────────────────────────────
    if (pref.inapp_reminders_enabled) {
      const notifs: {
        user_id: string; title: string; message: string
        type: 'reminder'; link: string; is_read: boolean
      }[] = []

      if (todayTasks.length > 0) {
        notifs.push({
          user_id: u.id,
          title:   `📅 ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today`,
          message: todayTasks.slice(0, 3).map(t => t.title).join(', ') +
                   (todayTasks.length > 3 ? ` +${todayTasks.length - 3} more` : ''),
          type:    'reminder',
          link:    '/calendar',
          is_read: false,
        })
      }

      if (overdueTasks.length > 0) {
        notifs.push({
          user_id: u.id,
          title:   `⚠️ ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
          message: 'You have incomplete tasks from previous days. Open the calendar to catch up.',
          type:    'reminder',
          link:    '/calendar',
          is_read: false,
        })
      }

      if (upcomingTests.length > 0) {
        const next    = upcomingTests[0]
        const dateStr = new Date(next.task_date + 'T12:00:00Z').toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        })
        notifs.push({
          user_id: u.id,
          title:   '📝 Practice test coming up',
          message: `${next.title} · ${dateStr}`,
          type:    'reminder',
          link:    '/calendar',
          is_read: false,
        })
      }

      if (notifs.length > 0) {
        await supabase.from('notifications').insert(notifs)
      }
    }

    // ── Email ───────────────────────────────────────────────────────────────
    if (pref.email_reminders_enabled && resend && u.email) {
      const firstName = u.full_name?.split(' ')[0] ?? 'Student'
      const { subject, html } = buildReminderEmail({
        firstName, todayTasks, overdueTasks, upcomingTests, appUrl,
      })
      try {
        await resend.emails.send({ from: fromEmail, to: u.email, subject, html })
      } catch (emailErr) {
        console.error('[reminders/daily] email error for', u.email, emailErr)
      }
    }

    processed++
  }

  return NextResponse.json({
    ok: true,
    firedAt: now.toISOString(),
    processed,
    skipped,
  })
}

// Minimal liveness check — does not disclose schedule or configuration.
export async function GET() {
  return NextResponse.json({ ok: true })
}
