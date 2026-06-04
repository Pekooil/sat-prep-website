import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sat-planner.vercel.app'
  const now    = new Date()

  return [
    { url: `${appUrl}/login`,  lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${appUrl}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${appUrl}/info`,   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
