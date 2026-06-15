'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { setInventoryMode } from '@/actions/question-inventory'
import type { InventoryMode } from '@/actions/question-inventory'
import { cn } from '@/lib/utils'

interface InventoryModeToggleProps {
  mode: InventoryMode
  practiceTestCount: number
  onModeChange: (mode: InventoryMode) => void
}

export function InventoryModeToggle({
  mode,
  practiceTestCount,
  onModeChange,
}: InventoryModeToggleProps) {
  const [pending, startTransition] = useTransition()
  const [showWarning, setShowWarning] = useState(false)
  const [pendingMode, setPendingMode] = useState<InventoryMode | null>(null)

  const recommendedMode: InventoryMode =
    practiceTestCount >= 5 ? 'exclude_active' : 'include_active'
  const isOnRecommended = mode === recommendedMode
  const isIncludeActive = mode === 'include_active'

  function handleToggle(checked: boolean) {
    const next: InventoryMode = checked ? 'include_active' : 'exclude_active'
    if (next === mode) return
    setPendingMode(next)
    setShowWarning(true)
  }

  function confirmSwitch() {
    if (!pendingMode) return
    const newMode = pendingMode
    setShowWarning(false)
    setPendingMode(null)
    startTransition(async () => {
      const { error } = await setInventoryMode(newMode)
      if (!error) onModeChange(newMode)
    })
  }

  function cancelSwitch() {
    setShowWarning(false)
    setPendingMode(null)
  }

  return (
    <>
      <div className={cn(
        'rounded-xl border p-4 space-y-3',
        isOnRecommended
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
          : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20',
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Inventory Mode
              </p>
              {isOnRecommended ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Recommended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  Not recommended
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className={cn(
                'text-xs font-medium',
                !isIncludeActive
                  ? 'text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)]',
              )}>
                Exclude active
              </span>
              <Switch
                checked={isIncludeActive}
                onCheckedChange={handleToggle}
                disabled={pending}
                aria-label="Toggle inventory mode"
              />
              <span className={cn(
                'text-xs font-medium',
                isIncludeActive
                  ? 'text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)]',
              )}>
                Include active
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xs text-[var(--muted-foreground)]">
              {practiceTestCount} practice test{practiceTestCount !== 1 ? 's' : ''}
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              in your plan
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-1 border-t border-[var(--border)]">
          <Info className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            {isIncludeActive
              ? 'Include active uses higher question counts (includes questions currently in progress). Recommended for plans with 4 or fewer practice tests.'
              : 'Exclude active uses conservative question counts (excludes questions currently in progress). Recommended for plans with 5 or more practice tests.'}
            {' '}
            {practiceTestCount >= 5
              ? 'Your plan has 5+ practice tests — exclude active is recommended.'
              : 'Your plan has 4 or fewer practice tests — include active is recommended.'}
          </p>
        </div>
      </div>

      <Dialog open={showWarning} onOpenChange={(open) => { if (!open) cancelSwitch() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Switch inventory mode?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <p>
                  Switching to{' '}
                  <strong className="text-[var(--foreground)]">
                    {pendingMode === 'include_active' ? 'Include active' : 'Exclude active'}
                  </strong>{' '}
                  mode changes which question counts your study plan uses for inventory management.
                  This affects how many questions are assigned when you regenerate your plan.
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Switching between modes can cause incorrect management of your question bank inventory. Proceed with caution.
                </p>
                <p>
                  The recommended mode for your plan ({practiceTestCount} practice test{practiceTestCount !== 1 ? 's' : ''}) is{' '}
                  <strong className="text-[var(--foreground)]">
                    {recommendedMode === 'include_active' ? 'Include active' : 'Exclude active'}
                  </strong>
                  . We suggest staying with it.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelSwitch}>
              Stay with current mode
            </Button>
            <Button
              onClick={confirmSwitch}
              className="bg-amber-500 hover:bg-amber-600 text-white border-0"
            >
              Switch anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
