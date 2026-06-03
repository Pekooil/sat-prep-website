import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
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

  // First-time users must complete onboarding
  if (profile && profile.has_completed_onboarding === false) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Navbar user={profile} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
