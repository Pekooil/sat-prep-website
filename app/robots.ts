import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sat-planner.vercel.app'
  return {
    rules: [
      {
        userAgent: '*',
        // Dashboard is private — block all crawlers from authenticated pages
        disallow: ['/home', '/calendar', '/data', '/error-log', '/settings', '/inventory', '/tutorial', '/onboarding', '/api/'],
        allow: ['/', '/login', '/signup', '/privacy', '/terms'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
