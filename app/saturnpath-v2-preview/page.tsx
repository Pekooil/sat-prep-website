import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { SaturnpathV2Preview } from '@/components/v2-preview/saturnpath-v2-preview'

const manrope = Manrope({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'V2 Web Design Preview',
  description: 'A front-end-only preview of the mobile-inspired SaturnPath web experience.',
  robots: { index: false, follow: false },
}

export default function SaturnpathV2PreviewPage() {
  return (
    <main id="main-content" className={manrope.className}>
      <SaturnpathV2Preview />
    </main>
  )
}
