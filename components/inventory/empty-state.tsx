'use client'

import { Package } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)] mb-4">
        <Package className="h-8 w-8" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No inventory yet</h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
        Question Bank inventory is managed by your administrator. Once data has been entered, it will appear here and the planner will use it to generate realistic study plans.
      </p>
    </div>
  )
}
