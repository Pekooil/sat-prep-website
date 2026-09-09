import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'
import manifest from '@/app/manifest'

describe('public SEO routes', () => {
  it('uses the canonical domain and contains only live public destinations', () => {
    const entries = sitemap()
    const urls = entries.map((entry) => entry.url)

    expect(urls).toContain('https://saturnpath.app')
    expect(urls).toContain('https://saturnpath.app/tools/sat-study-plan')
    expect(urls).toContain('https://saturnpath.app/tools/sat-error-log-template')
    expect(urls).toContain('https://saturnpath.app/guides/sat-error-log')
    expect(urls).toContain('https://saturnpath.app/guides/how-long-to-study-for-the-sat')
    expect(urls).toContain('https://saturnpath.app/about')
    expect(urls.some((url) => url.includes('vercel.app'))).toBe(false)
    expect(urls.some((url) => url.endsWith('/info'))).toBe(false)
    expect(urls.some((url) => url.endsWith('/login') || url.endsWith('/signup'))).toBe(false)
  })

  it('points crawlers to the canonical sitemap', () => {
    const config = robots()
    expect(config.sitemap).toBe('https://saturnpath.app/sitemap.xml')
    expect(config.host).toBe('https://saturnpath.app')
  })

  it('exposes an installable manifest with live icon routes', () => {
    const config = manifest()
    expect(config.start_url).toBe('/')
    expect(config.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/apple-icon' }),
      expect.objectContaining({ src: '/favicon.ico' }),
    ]))
  })
})
