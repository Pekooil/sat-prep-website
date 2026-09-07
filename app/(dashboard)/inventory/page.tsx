import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Question Inventory',
  description: 'Track how many College Board Question Bank questions are available in each SAT category.',
}

export default function InventoryPage() {
  // Retired V1 compatibility URL. Never render the legacy inventory UI.
  redirect('/home')
}
