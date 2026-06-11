/**
 * Supabase public env accessors.
 *
 * These are read in many places (server client, browser client, proxy). Using
 * `process.env.NEXT_PUBLIC_SUPABASE_URL!` (a bare non-null assertion) gives NO
 * runtime safety: when the variable is missing or empty in a deployment, the
 * Supabase SDK throws a cryptic "supabaseUrl is required" deep inside an auth
 * call, which surfaces to the user as a request that silently hangs.
 *
 * These helpers fail loudly and early with an actionable message instead, so a
 * misconfigured environment is obvious in logs and to the user.
 *
 * Note: `NEXT_PUBLIC_*` values are inlined at build time for client bundles, so
 * if they are missing when the app is BUILT, the browser will also throw here.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Set it in .env.local for local development, or in your Vercel project ` +
        `settings (Settings → Environment Variables) and redeploy. ` +
        `Find the value in your Supabase project → Settings → API.`,
    )
  }
  return value
}

export function getSupabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
}

export function getSupabaseAnonKey(): string {
  return required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
