import type { Metadata } from 'next'
import { V2Profile } from '@/components/v2-product/v2-profile'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your SaturnPath V2 profile, score target, and practice preferences.',
}

export default function SettingsPage() {
  return <V2Profile />
}
