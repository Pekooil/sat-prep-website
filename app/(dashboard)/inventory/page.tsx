import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { Package } from 'lucide-react'
import { getInventoryWithStats } from '@/actions/question-inventory'
import { InventoryClient } from '@/components/inventory/inventory-client'

export const metadata: Metadata = {
  title: 'Question Inventory',
  description: 'Track how many College Board Question Bank questions are available in each SAT category.',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default async function InventoryPage() {
  noStore()

  const { data: items = [], lastUpdated, error } = await getInventoryWithStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Question Inventory</h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] max-w-xl">
            Track available College Board Question Bank questions per category. The planner uses this inventory to avoid over-assigning questions that don't exist.
          </p>
          {lastUpdated && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Last updated: {formatDate(lastUpdated)}
            </p>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          Failed to load inventory: {error}
        </div>
      ) : (
        <InventoryClient items={items} lastUpdated={lastUpdated ?? null} />
      )}
    </div>
  )
}
