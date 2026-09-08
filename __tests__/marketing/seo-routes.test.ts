import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'

describe('public SEO routes', () => {
  it('uses the canonical domain and contains only live public destinations', () => {
    const entries = sitemap()
    const urls = entries.map((entry) => entry.url)

    expect(urls).toContain('https://saturnpath.app')
    expect(urls).toContain('https://saturnpath.app/tools/sat-study-plan')
    expect(urls).toContain('https://saturnpath.app/guides/sat-error-log')
    expect(urls.some((url) => url.includes('vercel.app'))).toBe(false)
    expect(urls.some((url) => url.endsWith('/info'))).toBe(false)
    expect(urls.some((url) => url.endsWith('/login') || url.endsWith('/signup'))).toBe(false)
  })

  it('points crawlers to the canonical sitemap', () => {
    const config = robots()
    expect(config.sitemap).toBe('https://saturnpath.app/sitemap.xml')
    expect(config.host).toBe('https://saturnpath.app')
  })
})
