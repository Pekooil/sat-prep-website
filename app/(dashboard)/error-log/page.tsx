import type { Metadata } from 'next'
import { V2Review } from '@/components/v2-product/v2-review'

export const metadata: Metadata = { title: 'Review', description: 'Your SaturnPath V2 review queue.' }

export default function ErrorLogPage() { return <V2Review /> }
