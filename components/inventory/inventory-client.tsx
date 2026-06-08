'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SummaryCards } from './summary-cards'
import { ProgressVisualization } from './progress-visualization'
import { InventoryTable } from './inventory-table'
import { InventoryAdmin } from './inventory-admin'
import { InventoryCharts } from './inventory-charts'
import { EmptyState } from './empty-state'
import type { InventoryItemWithStats } from '@/actions/question-inventory'

interface InventoryClientProps {
  items: InventoryItemWithStats[]
  lastUpdated: string | null
}

export function InventoryClient({ items: initial, lastUpdated }: InventoryClientProps) {
  const [items, setItems] = useState(initial)
  const [activeTab, setActiveTab] = useState('overview')

  if (items.length === 0) {
    return (
      <EmptyState
        onImport={() => setActiveTab('admin')}
        onCreate={() => setActiveTab('admin')}
      />
    )
  }

  const totalAvailable = items.reduce((s, i) => s + i.available_count, 0)
  const totalAssigned  = items.reduce((s, i) => s + i.assigned, 0)
  const totalCompleted = items.reduce((s, i) => s + i.completed, 0)
  const totalRemaining = items.reduce((s, i) => s + i.remaining, 0)

  return (
    <div className="space-y-5">
      <SummaryCards
        totalAvailable={totalAvailable}
        totalAssigned={totalAssigned}
        totalCompleted={totalCompleted}
        totalRemaining={totalRemaining}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 dark:bg-slate-800/80">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <ProgressVisualization items={items} />
          <InventoryCharts items={items} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <InventoryTable items={items} />
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
          <InventoryAdmin items={items} onUpdate={setItems} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
