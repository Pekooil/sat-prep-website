'use client'

import * as React from 'react'
import { Save, Loader2, Bell, Mail, BellOff, TestTube2, CheckCircle2, Clock, ClipboardList, CalendarDays, AlertTriangle, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { saveNotificationPreferences, sendTestReminder } from '@/actions/notification-preferences'
import { TIMEZONES } from '@/lib/constants'
import type { NotificationPrefsInput } from '@/actions/notification-preferences'
import { cn } from '@/lib/utils'

// ─── Sub-components ───────────────────────────────────────────────────────────

function PrefRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-4 rounded-[var(--radius-lg)] border p-4 transition-colors',
      checked
        ? 'border-[var(--border-strong)] bg-[var(--accent-soft)]'
        : 'border-[var(--border)] bg-[var(--card)]',
      disabled && 'opacity-50',
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
          checked ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]' : 'bg-[var(--surface-sunken)] text-[var(--text-muted)]',
        )}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationPrefs({ initial }: { initial: NotificationPrefsInput }) {
  const [prefs, setPrefs] = React.useState<NotificationPrefsInput>(initial)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const { toast } = useToast()

  function set<K extends keyof NotificationPrefsInput>(key: K, value: NotificationPrefsInput[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const result = await saveNotificationPreferences(prefs)
    setSaving(false)
    if (result.error) {
      toast({ title: 'Save failed', description: result.error, variant: 'destructive' })
    } else {
      setSaved(true)
      toast({ title: 'Preferences saved', description: 'Your notification settings have been updated.' })
    }
  }

  async function handleTestReminder() {
    setTesting(true)
    const result = await sendTestReminder()
    setTesting(false)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else if (result.notifCreated === 0) {
      toast({
        title: 'Nothing to remind',
        description: 'No tasks due today, no overdue tasks, and no upcoming practice tests.',
      })
    } else {
      toast({
        title: `${result.notifCreated} reminder${result.notifCreated > 1 ? 's' : ''} created`,
        description: [
          result.todayCount > 0 && `${result.todayCount} due today`,
          result.overdueCount > 0 && `${result.overdueCount} overdue`,
          result.testCount > 0 && `${result.testCount} upcoming test`,
        ].filter(Boolean).join(' · '),
      })
    }
  }

  const anyEnabled = prefs.email_reminders_enabled || prefs.inapp_reminders_enabled

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Delivery Channels ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--accent)]" />
            Delivery Channels
          </CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">
            Choose how you want to receive reminders.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <PrefRow
            icon={<Mail className="h-4 w-4" />}
            label="Email Reminders"
            description="Daily digest sent to your registered email address"
            checked={prefs.email_reminders_enabled}
            onCheckedChange={v => set('email_reminders_enabled', v)}
          />
          <PrefRow
            icon={<Bell className="h-4 w-4" />}
            label="In-App Notifications"
            description="Reminders shown in the notification bell in the navbar"
            checked={prefs.inapp_reminders_enabled}
            onCheckedChange={v => set('inapp_reminders_enabled', v)}
          />

          {!anyEnabled && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <BellOff className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                All reminders are off. Enable at least one channel to stay on track.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── What to Remind ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[var(--accent)]" />
            What to Remind
          </CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">
            Select which types of events trigger a reminder.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <PrefRow
            icon={<CalendarDays className="h-4 w-4" />}
            label="Today's Assignments"
            description="Remind me about study tasks due today"
            checked={prefs.daily_assignment_reminder}
            onCheckedChange={v => set('daily_assignment_reminder', v)}
            disabled={!anyEnabled}
          />
          <PrefRow
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Overdue Assignments"
            description="Alert me when I have incomplete tasks from previous days"
            checked={prefs.overdue_reminder}
            onCheckedChange={v => set('overdue_reminder', v)}
            disabled={!anyEnabled}
          />
          <PrefRow
            icon={<FileText className="h-4 w-4" />}
            label="Upcoming Practice Tests"
            description="Notify me about practice tests scheduled in the next 7 days"
            checked={prefs.practice_test_reminder}
            onCheckedChange={v => set('practice_test_reminder', v)}
            disabled={!anyEnabled}
          />
        </CardContent>
      </Card>

      {/* ── Schedule ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--accent)]" />
            Reminder Schedule
          </CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">
            Reminders are sent once daily at <strong>8:00 AM</strong> in your timezone.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-sm font-medium">
              Your Timezone
            </Label>
            <Select
              value={prefs.timezone}
              onValueChange={v => set('timezone', v)}
              disabled={!anyEnabled}
            >
              <SelectTrigger id="timezone" className="h-10">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[var(--muted-foreground)]">
              Used to calculate your local &ldquo;today&rdquo; when fetching tasks.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
          ) : saved ? (
            <><CheckCircle2 className="h-4 w-4" />Saved</>
          ) : (
            <><Save className="h-4 w-4" />Save Preferences</>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleTestReminder}
          disabled={testing || !anyEnabled}
          className="gap-2"
          title={!anyEnabled ? 'Enable at least one reminder channel first' : undefined}
        >
          {testing ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
          ) : (
            <><TestTube2 className="h-4 w-4" />Send Test Reminder Now</>
          )}
        </Button>

        <p className="text-xs text-[var(--muted-foreground)] flex-1 min-w-0">
          "Send Test" creates in-app notifications immediately so you can see
          how reminders look without waiting for the daily schedule.
        </p>
      </div>
    </div>
  )
}
