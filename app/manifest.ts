import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SaturnPath — Free Adaptive SAT Prep',
    short_name: 'SaturnPath',
    description: 'Free personalized SAT study plans, adaptive practice, mistake review, and progress tracking.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f9ff',
    theme_color: '#6857f6',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
  }
}
