/**
 * Turn Supabase's intentionally generic auth failures into the next useful
 * action for a student. In particular, an account created from the Supabase
 * dashboard can remain unconfirmed even after the project's "Confirm email"
 * setting is switched off; that setting does not update existing users.
 */
export function formatSignInError(error: { code?: string; message: string }): string {
  const normalized = error.message.toLowerCase()
  if (
    error.code === 'email_not_confirmed' ||
    normalized.includes('email not confirmed') ||
    normalized.includes('email not verified')
  ) {
    return 'This account\'s email is not confirmed. If you created it in Supabase, open Authentication → Users for this project, choose Confirm email for the account, then sign in again. Otherwise, use the confirmation link from your inbox.'
  }

  if (error.code === 'invalid_credentials' || normalized === 'invalid login credentials') {
    return 'Email or password is incorrect. If this is a staging user created in Supabase, reset the password from Authentication → Users and try again.'
  }

  return error.message
}
