import type { NextConfig } from 'next'

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
  async redirects() {
    return [
      { source: '/', destination: '/home', permanent: false },
    ]
  },
}

export default nextConfig
