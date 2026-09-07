export const DEFAULT_AUTH_PATH = '/home'

const RETIRED_V1_PATHS = new Set(['/calendar', '/inventory', '/tutorial'])

export function safeAuthPath(value: unknown, fallback = DEFAULT_AUTH_PATH): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return fallback

  const url = new URL(value, 'https://saturnpath.app')
  const pathname = url.pathname.replace(/\/+$/, '') || '/'
  if (RETIRED_V1_PATHS.has(pathname)) return DEFAULT_AUTH_PATH
  return `${url.pathname}${url.search}${url.hash}`
}
