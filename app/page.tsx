import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/marketing/landing-page'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged-in users go straight to the app. Logged-out visitors see the
  // public marketing landing page (the wishlist is the only live action).
  if (user) {
    redirect('/home')
  }

  return <LandingPage />
}
