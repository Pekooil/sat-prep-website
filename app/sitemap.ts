import type { MetadataRoute } from 'next'
import { CANONICAL_APP_URL } from '@/lib/app-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date('2026-09-07T00:00:00.000Z')

  return [
    { url: CANONICAL_APP_URL, lastModified: updated, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${CANONICAL_APP_URL}/tools/sat-study-plan`, lastModified: updated, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${CANONICAL_APP_URL}/guides`, lastModified: updated, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${CANONICAL_APP_URL}/guides/30-day-digital-sat-study-plan`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${CANONICAL_APP_URL}/guides/8-week-digital-sat-study-plan`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${CANONICAL_APP_URL}/guides/sat-error-log`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${CANONICAL_APP_URL}/guides/college-board-question-bank`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${CANONICAL_APP_URL}/privacy`, lastModified: updated, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${CANONICAL_APP_URL}/terms`, lastModified: updated, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
