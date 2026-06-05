import { Bell } from 'lucide-react'
import { NotificationPrefs } from '@/components/settings/notification-prefs'
import { getNotificationPreferences } from '@/actions/notification-preferences'

export default async function SettingsPage() {
  const { data: prefs } = await getNotificationPreferences()

  return (
    <div className="max-w-2xl space-y-8">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-500" />
          Notification Settings
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Configure how you receive SAT study reminders.
          Reminders are sent once daily at 8:00 AM in your timezone.
        </p>
      </div>

      {/* ── Setup note (shown when RESEND_API_KEY not yet configured) ────── */}
      {!process.env.RESEND_API_KEY && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-300">📧 Email setup required</p>
          <p className="text-amber-700 dark:text-amber-400 mt-1">
            To enable email reminders, add the following to your{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env.local</code>:
          </p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 dark:bg-amber-900/40 rounded-lg p-3 overflow-x-auto text-amber-900 dark:text-amber-200">
{`RESEND_API_KEY=re_...          # from resend.com → API Keys
RESEND_FROM_EMAIL=SaturnPath <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
SUPABASE_SERVICE_ROLE_KEY=...  # Supabase → Settings → API
CRON_SECRET=any-random-string  # protects the cron endpoint`}
          </pre>
          <p className="text-amber-700 dark:text-amber-400 mt-2 text-xs">
            In-app reminders work without these — only email delivery requires Resend.
          </p>
        </div>
      )}

      {/* ── Preferences form ─────────────────────────────────────────────── */}
      <NotificationPrefs initial={prefs} />
    </div>
  )
}
