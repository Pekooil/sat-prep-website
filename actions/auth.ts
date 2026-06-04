'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  'use server'
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/home')
}

export async function signUp(formData: FormData) {
  'use server'
  const email    = formData.get('email')     as string
  const password = formData.get('password')  as string
  const fullName = formData.get('full_name') as string

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) {
    return { error: error.message }
  }

  // Email confirmation is enabled in Supabase — session won't exist yet.
  // Redirect to login with a flag so the page shows a "check your email" message.
  if (!data.session) {
    return { needsConfirmation: true }
  }

  redirect('/home')
}

export async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
