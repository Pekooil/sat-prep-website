import type { NextConfig } from 'next'

// Content-Security-Policy. Kept on a single line for the header value.
// - script/style allow 'unsafe-inline' because the app ships an inline theme
//   script and relies on inline style attributes (Tailwind/Recharts); a strict
//   nonce-based policy would require middleware nonce plumbing (future hardening).
// - 'unsafe-eval' is added in DEVELOPMENT ONLY (Next.js HMR / React Refresh need
//   it); production stays free of eval.
// - connect/script are scoped to Supabase + Vercel Analytics/Speed Insights only.
// - frame-ancestors/base-uri/form-action/object-src lock down clickjacking,
//   base-tag injection, form hijacking, and plugin embedding.
const isDev = process.env.NODE_ENV !== 'production'
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  'https://va.vercel-scripts.com',
  ...(isDev ? ["'unsafe-eval'"] : []),
].join(' ')

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src ${scriptSrc}`,
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  'upgrade-insecure-requests',
].join('; ')

const nextConfig: NextConfig = {
  // ── Compiler options ────────────────────────────────────────────────────
  reactStrictMode: true,

  // ── Image optimization ──────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // ── Security headers ────────────────────────────────────────────────────
  // Note: do NOT set a custom Cache-Control on /_next/static — Next.js already
  // serves those assets as `public, max-age=31536000, immutable`. A manual
  // override triggers a build warning and can break dev asset behavior.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy',   value: CSP },
          { key: 'X-DNS-Prefetch-Control',    value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },

  // ── Redirects ───────────────────────────────────────────────────────────
  // NOTE: `/` is intentionally NOT redirected here. The root route renders the
  // public marketing landing page for logged-out visitors; app/page.tsx itself
  // redirects authenticated users to /home (see RootPage).
}

export default nextConfig
