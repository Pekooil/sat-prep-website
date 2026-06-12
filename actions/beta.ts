'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// SHA-256 hash of the password + a fixed salt so the cookie value is
// opaque — someone inspecting their cookies can't reverse it to the password,
// and manually setting the cookie to an arbitrary string won't bypass the gate.
async function betaToken(password: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password + '-saturnpath-beta'))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface BetaResult {
  error?: string
}

export async function submitBetaPassword(formData: FormData): Promise<BetaResult> {
  const entered = String(formData.get('password') ?? '').trim()
  const next    = String(formData.get('next')     ?? '/login')

  const actual = process.env.BETA_PASSWORD
  if (!actual) {
    // Gate is disabled — just send them through.
    const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/login'
    redirect(safePath)
  }

  if (!entered) return { error: 'Please enter the beta password.' }
  if (entered !== actual) return { error: 'Incorrect password. Ask for the beta access code.' }

  const token = await betaToken(actual)
  const cookieStore = await cookies()
  cookieStore.set('beta-access', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secure: process.env.NODE_ENV === 'production',
  })

  const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/login'
  redirect(safePath)
}
