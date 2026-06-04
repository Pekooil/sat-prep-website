import { describe, it, expect } from 'vitest'
import { buildReminderEmail, type ReminderTask } from '@/lib/email/reminder-template'

const noTasks: ReminderTask[] = []

const todayTask: ReminderTask = {
  title: 'Algebra — Foundation · 15q',
  task_date: new Date().toISOString().split('T')[0],
  duration_minutes: 30,
  category: 'Algebra',
}

const overdueTask: ReminderTask = {
  title: 'Advanced Math — Skill · 10q',
  task_date: '2025-01-01',
  duration_minutes: 25,
  category: 'Advanced Math',
}

const practiceTest: ReminderTask = {
  title: 'Full Practice Test #1',
  task_date: new Date(Date.now() + 3 * 86_400_000).toISOString().split('T')[0],
  duration_minutes: 180,
  category: 'Full Practice Test',
}

// ─── Subject line ─────────────────────────────────────────────────────────────

describe('buildReminderEmail — subject line', () => {
  it('returns all-clear subject when nothing to remind', () => {
    const { subject } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [], overdueTasks: [], upcomingTests: [], appUrl: 'https://example.com',
    })
    expect(subject).toContain('caught up')
  })

  it('includes today task count in subject', () => {
    const { subject } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [todayTask], overdueTasks: [], upcomingTests: [], appUrl: 'https://example.com',
    })
    expect(subject).toMatch(/1 task today/)
  })

  it('includes overdue count in subject', () => {
    const { subject } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [], overdueTasks: [overdueTask], upcomingTests: [], appUrl: 'https://example.com',
    })
    expect(subject).toContain('overdue')
  })

  it('includes practice test signal in subject', () => {
    const { subject } = buildReminderEmail({
      firstName: 'Alex', todayTasks: noTasks, overdueTasks: noTasks, upcomingTests: [practiceTest], appUrl: 'https://example.com',
    })
    expect(subject).toContain('practice test')
  })

  it('combines multiple signals with ·', () => {
    const { subject } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [todayTask], overdueTasks: [overdueTask], upcomingTests: [], appUrl: 'https://example.com',
    })
    expect(subject).toContain('·')
  })
})

// ─── HTML content ─────────────────────────────────────────────────────────────

describe('buildReminderEmail — HTML', () => {
  it('contains the first name', () => {
    const { html } = buildReminderEmail({
      firstName: 'Jordan', todayTasks: [todayTask], overdueTasks: [], upcomingTests: [], appUrl: 'https://example.com',
    })
    expect(html).toContain('Jordan')
  })

  it('contains task title in HTML', () => {
    const { html } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [todayTask], overdueTasks: [], upcomingTests: [], appUrl: 'https://example.com',
    })
    expect(html).toContain('Algebra — Foundation')
  })

  it('contains app URL in CTA button', () => {
    const appUrl = 'https://my-sat-app.vercel.app'
    const { html } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [todayTask], overdueTasks: [], upcomingTests: [], appUrl,
    })
    expect(html).toContain(appUrl)
  })

  it('shows all-caught-up emoji when no tasks', () => {
    const { html } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [], overdueTasks: [], upcomingTests: [], appUrl: 'https://example.com',
    })
    expect(html).toContain('🎉')
  })

  it('escapes HTML special characters in task title', () => {
    const xssTask: ReminderTask = {
      title: '<script>alert("xss")</script>',
      task_date: new Date().toISOString().split('T')[0],
      duration_minutes: 20,
      category: null,
    }
    const { html } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [xssTask], overdueTasks: [], upcomingTests: [], appUrl: 'https://example.com',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('produces valid HTML structure', () => {
    const { html } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [todayTask], overdueTasks: [overdueTask], upcomingTests: [practiceTest], appUrl: 'https://example.com',
    })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
    expect(html).toContain('<body')
    expect(html).toContain('</body>')
  })
})

// ─── Duration badge ───────────────────────────────────────────────────────────

describe('buildReminderEmail — duration badge', () => {
  it('shows duration in minutes when present', () => {
    const { html } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [todayTask], overdueTasks: [], upcomingTests: [], appUrl: 'https://example.com',
    })
    expect(html).toContain('30m')
  })

  it('omits duration badge when null', () => {
    const noDuration: ReminderTask = { ...todayTask, duration_minutes: null }
    const { html } = buildReminderEmail({
      firstName: 'Alex', todayTasks: [noDuration], overdueTasks: [], upcomingTests: [], appUrl: 'https://example.com',
    })
    expect(html).not.toContain('nullm')
  })
})
