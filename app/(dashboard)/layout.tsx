import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Age gate + consent must be on file before accessing the app. This catches
  // first-time Google users (no terms_accepted_at yet) AND legacy accounts
  // created before the age gate existed (birth_year IS NULL) — closing the
  // COPPA gap for pre-existing users, not just new signups.
  if (profile && (!profile.terms_accepted_at || profile.birth_year == null)) {
    redirect('/auth/google-consent')
  }

  // First-time users must complete onboarding
  if (profile && !profile.has_completed_onboarding) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar user={profile} />
      <div className="flex min-h-screen flex-col md:pl-[var(--sidebar-width)]">
        <Topbar user={profile} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-10 lg:px-8"
        >
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
