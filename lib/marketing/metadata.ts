import type { Metadata } from 'next'

const SOCIAL_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'SaturnPath — Free personalized SAT study planning and adaptive practice',
}

export function createSocialMetadata({
  title,
  description,
  path,
  type = 'website',
}: {
  title: string
  description: string
  path: string
  type?: 'website' | 'article'
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: {
      type,
      locale: 'en_US',
      siteName: 'SaturnPath',
      title,
      description,
      url: path,
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SOCIAL_IMAGE.url],
    },
  }
}
