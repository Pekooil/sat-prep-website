'use client'

import { useState, useTransition } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { SummaryCards } from './summary-cards'
import { ProgressVisualization } from './progress-visualization'
import { InventoryTable } from './inventory-table'
import { InventoryCharts } from './inventory-charts'
import { EmptyState } from './empty-state'
import { InventoryModeToggle } from './inventory-mode-toggle'
import { getInventoryWithStats } from '@/actions/question-inventory'
import type { InventoryItemWithStats, InventoryMode } from '@/actions/question-inventory'

interface InventoryClientProps {
  items: InventoryItemWithStats[]
  lastUpdated: string | null
  mode: InventoryMode
  practiceTestCount: number
}

export function InventoryClient({
  items: initial,
  lastUpdated,
  mode: initialMode,
  practiceTestCount,
}: InventoryClientProps) {
  const [items, setItems] = useState(initial)
  const [activeTab, setActiveTab] = useState('overview')
  const [mode, setMode] = useState<InventoryMode>(initialMode)
  const [fetchingItems, startFetch] = useTransition()

  function handleModeChange(newMode: InventoryMode) {
    setMode(newMode)
    startFetch(async () => {
      const { data: newItems } = await getInventoryWithStats(newMode)
      if (newItems) setItems(newItems)
    })
  }

  if (items.length === 0) {
    return <EmptyState />
  }

  const totalAvailable = items.reduce((s, i) => s + i.available_count, 0)
  const totalAssigned  = items.reduce((s, i) => s + i.assigned, 0)
  const totalCompleted = items.reduce((s, i) => s + i.completed, 0)
  const totalRemaining = items.reduce((s, i) => s + i.remaining, 0)

  return (
    <div className={cn('space-y-5', fetchingItems && 'opacity-60 pointer-events-none transition-opacity duration-200')}>
      <SummaryCards
        totalAvailable={totalAvailable}
        totalAssigned={totalAssigned}
        totalCompleted={totalCompleted}
        totalRemaining={totalRemaining}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <ProgressVisualization items={items} />
          <InventoryCharts items={items} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4 space-y-4">
          <InventoryModeToggle
            mode={mode}
            practiceTestCount={practiceTestCount}
            onModeChange={handleModeChange}
          />
          <InventoryTable items={items} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
