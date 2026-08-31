import type { Metadata } from 'next'
import { SaturnpathV2Preview } from '@/components/v2-preview/saturnpath-v2-preview'

export const metadata: Metadata = {
  title: 'V2 Web Design Preview',
  description: 'A front-end-only preview of the mobile-inspired SaturnPath web experience.',
  robots: { index: false, follow: false },
}

export default function SaturnpathV2PreviewPage() {
  return (
    <main id="main-content">
      <SaturnpathV2Preview />
    </main>
  )
}
