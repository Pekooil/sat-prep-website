/**
 * reminder-template.ts
 *
 * Generates the plain-HTML email for the daily reminder digest.
 * Uses inline styles throughout so it renders correctly in all major
 * email clients (Gmail, Outlook, Apple Mail, etc.).
 */

import { LEGAL } from '@/lib/legal/config'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReminderTask {
  title: string
  task_date: string
  duration_minutes: number | null
  category: string | null
}

export interface ReminderEmailData {
  firstName: string
  todayTasks: ReminderTask[]
  overdueTasks: ReminderTask[]
  upcomingTests: ReminderTask[]
  appUrl: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function friendlyDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function taskRow(task: ReminderTask, color: string, emoji: string): string {
  return `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid #f1f5f9;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size:14px; color:${color}; font-weight:500;">
                ${emoji} ${esc(task.title)}
              </span>
            </td>
            <td align="right" style="white-space:nowrap;">
              ${task.duration_minutes
                ? `<span style="font-size:12px; color:#94a3b8; background:#f1f5f9; padding:2px 8px; border-radius:12px;">${task.duration_minutes}m</span>`
                : ''}
              ${task.task_date !== new Date().toISOString().split('T')[0]
                ? `<span style="font-size:12px; color:#94a3b8; margin-left:6px;">${friendlyDate(task.task_date)}</span>`
                : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

function section(
  title: string,
  borderColor: string,
  tasks: ReminderTask[],
  taskColor: string,
  emoji: string,
): string {
  if (tasks.length === 0) return ''
  return `
    <div style="margin-bottom:28px;">
      <h2 style="
        font-size:15px; font-weight:700; color:#1e293b; margin:0 0 12px;
        padding-bottom:10px; border-bottom:2px solid ${borderColor};
        letter-spacing:0.01em;
      ">${title}</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${tasks.map(t => taskRow(t, taskColor, emoji)).join('')}
      </table>
    </div>`
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildReminderEmail(d: ReminderEmailData): {
  subject: string
  html: string
} {
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const todaySection = section(
    `📅 Today's Assignments (${d.todayTasks.length})`,
    '#7c3aed',
    d.todayTasks,
    '#5b21b6',
    '📖',
  )
  const overdueSection = section(
    `⚠️ Overdue (${d.overdueTasks.length})`,
    '#ef4444',
    d.overdueTasks,
    '#b91c1c',
    '⚠️',
  )
  const testSection = section(
    `📝 Upcoming Practice Tests (${d.upcomingTests.length})`,
    '#7c3aed',
    d.upcomingTests,
    '#5b21b6',
    '📝',
  )

  const hasContent = d.todayTasks.length + d.overdueTasks.length + d.upcomingTests.length > 0
  const emptySate = hasContent ? '' : `
    <div style="text-align:center; padding:24px 0; color:#64748b;">
      <p style="font-size:32px; margin:0 0 8px;">🎉</p>
      <p style="font-size:15px; font-weight:600; margin:0 0 4px; color:#374151;">All caught up!</p>
      <p style="font-size:13px; margin:0;">No tasks or upcoming tests today. Great work staying on top of your prep.</p>
    </div>`

  const subjectParts: string[] = []
  if (d.todayTasks.length > 0)  subjectParts.push(`${d.todayTasks.length} task${d.todayTasks.length > 1 ? 's' : ''} today`)
  if (d.overdueTasks.length > 0) subjectParts.push(`${d.overdueTasks.length} overdue`)
  if (d.upcomingTests.length > 0) subjectParts.push('practice test soon')
  const subject = subjectParts.length > 0
    ? `📚 ${subjectParts.join(' · ')} — SAT Study Planner`
    : '✅ All caught up · SAT Study Planner'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SAT Study Planner – Daily Reminder</title>
</head>
<body style="margin:0; padding:0; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; -webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc; padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; width:100%;">

        <!-- ── Header ───────────────────────────────────────────────────── -->
        <tr>
          <td style="
            background:linear-gradient(135deg,#1d4ed8 0%,#4f46e5 100%);
            border-radius:16px 16px 0 0;
            padding:28px 32px 24px;
          ">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0; font-size:13px; color:#bfdbfe; font-weight:500; letter-spacing:0.05em; text-transform:uppercase;">SAT Study Planner AI</p>
                  <h1 style="margin:4px 0 0; font-size:22px; font-weight:700; color:#ffffff;">Daily Study Digest</h1>
                </td>
                <td align="right" style="vertical-align:top;">
                  <p style="margin:0; font-size:12px; color:#93c5fd; white-space:nowrap;">${esc(todayFormatted)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Body ─────────────────────────────────────────────────────── -->
        <tr>
          <td style="
            background:#ffffff;
            padding:32px;
            border-radius:0 0 16px 16px;
            border:1px solid #e2e8f0;
            border-top:none;
          ">
            <p style="font-size:15px; color:#374151; margin:0 0 24px;">
              Hi ${esc(d.firstName)}, here's your study update for today.
            </p>

            ${todaySection}
            ${overdueSection}
            ${testSection}
            ${emptySate}

            <!-- CTA button -->
            <div style="text-align:center; margin-top:32px; padding-top:24px; border-top:1px solid #f1f5f9;">
              <a href="${esc(d.appUrl)}/calendar"
                 style="
                   display:inline-block;
                   background:#1d4ed8; color:#ffffff;
                   text-decoration:none; font-size:14px; font-weight:600;
                   padding:13px 32px; border-radius:10px;
                   letter-spacing:0.01em;
                 ">
                Open My Study Plan →
              </a>
            </div>
          </td>
        </tr>

        <!-- ── Footer ───────────────────────────────────────────────────── -->
        <tr>
          <td style="padding:20px 32px; text-align:center;">
            <p style="font-size:12px; color:#94a3b8; margin:0; line-height:1.6;">
              You received this because email reminders are enabled on your account.<br />
              <a href="${esc(d.appUrl)}/settings" style="color:#7c3aed; text-decoration:underline;">Manage notification preferences or unsubscribe</a><br />
              ${esc(LEGAL.legalEntity)}${LEGAL.mailingAddress ? `<br />${esc(LEGAL.mailingAddress)}` : ''}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}
