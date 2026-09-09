import { CANONICAL_APP_URL } from '@/lib/app-url'

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export function HomeStructuredData() {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${CANONICAL_APP_URL}/#organization`,
          name: 'SaturnPath',
          url: CANONICAL_APP_URL,
          logo: `${CANONICAL_APP_URL}/saturn-mark.svg`,
          description: 'Free adaptive SAT preparation with personalized planning, practice, review, and progress tracking.',
        },
        {
          '@type': 'WebSite',
          '@id': `${CANONICAL_APP_URL}/#website`,
          name: 'SaturnPath',
          url: CANONICAL_APP_URL,
          publisher: { '@id': `${CANONICAL_APP_URL}/#organization` },
          inLanguage: 'en-US',
        },
        {
          '@type': 'SoftwareApplication',
          name: 'SaturnPath',
          url: CANONICAL_APP_URL,
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Web',
          description: 'A free adaptive SAT study planner with focused practice, mistake review, and progress tracking.',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        },
      ],
    }} />
  )
}

export function BreadcrumbStructuredData({ items }: { items: Array<{ name: string; path: string }> }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${CANONICAL_APP_URL}${item.path}`,
      })),
    }} />
  )
}

export function FaqStructuredData({ items }: { items: Array<{ question: string; answer: string }> }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    }} />
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
      dateModified: '2026-09-09',
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

export function WebToolStructuredData({ name, description, path }: { name: string; description: string; path: string }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name,
      description,
      url: `${CANONICAL_APP_URL}${path}`,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript for editing and printing',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    }} />
  )
}
