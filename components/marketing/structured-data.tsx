import { CANONICAL_APP_URL } from '@/lib/app-url'

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export function ArticleStructuredData({ title, description, path }: { title: string; description: string; path: string }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      datePublished: '2026-09-07',
      dateModified: '2026-09-07',
      mainEntityOfPage: `${CANONICAL_APP_URL}${path}`,
      author: { '@type': 'Organization', name: 'SaturnPath', url: CANONICAL_APP_URL },
      publisher: { '@type': 'Organization', name: 'SaturnPath', url: CANONICAL_APP_URL },
    }} />
  )
}

export function PlannerStructuredData() {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'SaturnPath SAT Study Plan Generator',
      description: 'A free personalized Digital SAT study plan generator based on score, goal, test date, time, and weak area.',
      url: `${CANONICAL_APP_URL}/tools/sat-study-plan`,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    }} />
  )
}
