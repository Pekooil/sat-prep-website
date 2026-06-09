import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  eyebrow?: React.ReactNode
  /** Right-aligned actions (buttons, controls). */
  actions?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

/**
 * Standard page header: eyebrow, display title, supporting copy, and actions.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]">
            {icon}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          {eyebrow && <p className="sp-eyebrow">{eyebrow}</p>}
          <h1 className="sp-display text-2xl sm:text-3xl truncate">{title}</h1>
          {description && (
            <p className="text-sm text-[var(--text-muted)] leading-snug">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
