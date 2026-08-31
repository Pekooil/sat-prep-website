import type { Metadata } from 'next'
import { V2Progress } from '@/components/v2-product/v2-progress'

export const metadata: Metadata = { title: 'Progress', description: 'Your SaturnPath V2 progress and skill mastery.' }

export default function DataPage() { return <V2Progress /> }
