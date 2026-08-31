import type { Metadata } from 'next'
import { V2Home } from '@/components/v2-product/v2-home'

export const metadata: Metadata = { title: 'Today', description: 'Your SaturnPath V2 adaptive study plan and practice session.' }

export default function HomePage() { return <V2Home /> }
