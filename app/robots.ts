import type { MetadataRoute } from 'next'
import { CANONICAL_APP_URL } from '@/lib/app-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Dashboard is private — block all crawlers from authenticated pages
        disallow: ['/home', '/calendar', '/data', '/error-log', '/settings', '/inventory', '/tutorial', '/onboarding', '/auth/', '/api/', '/saturnpath-v2-preview'],
        allow: ['/', '/tools/', '/guides/', '/privacy', '/terms'],
      },
    ],
    sitemap: `${CANONICAL_APP_URL}/sitemap.xml`,
    host: CANONICAL_APP_URL,
  }
}
