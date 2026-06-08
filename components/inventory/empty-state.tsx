'use client'

import { Package, Upload, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onImport?: () => void
  onCreate?: () => void
}

export function EmptyState({ onImport, onCreate }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30 mb-4">
        <Package className="h-8 w-8 text-violet-600 dark:text-violet-400" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No inventory yet</h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-sm mb-8">
        Add your Question Bank inventory to help SaturnPath generate realistic study plans.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Button
          variant="outline"
          className="gap-2"
          onClick={onImport}
        >
          <Upload className="h-4 w-4" />
          Import inventory
        </Button>
        <Button
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" />
          Create first category
        </Button>
      </div>
    </div>
  )
}
