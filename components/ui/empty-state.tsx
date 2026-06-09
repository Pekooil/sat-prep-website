import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** Compact variant for inside cards / panels. */
  compact?: boolean
}

/**
 * Centered empty / zero-data state with optional icon, copy, and CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 py-8' : 'gap-3 py-16',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] text-[var(--text-muted)]',
            compact ? 'h-10 w-10' : 'h-14 w-14'
          )}
        >
          <Icon className={compact ? 'h-5 w-5' : 'h-7 w-7'} strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1">
        <p className={cn('font-semibold text-[var(--text-heading)] tracking-[var(--tracking-snug)]', compact ? 'text-sm' : 'text-base')}>
          {title}
        </p>
        {description && (
          <p className={cn('mx-auto max-w-sm text-[var(--text-muted)] leading-snug', compact ? 'text-xs' : 'text-sm')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
