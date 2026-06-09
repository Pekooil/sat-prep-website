'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onValueChange: (value: T) => void
  size?: 'sm' | 'default'
  className?: string
  'aria-label'?: string
}

/**
 * A pill segmented control (view switcher) à la Linear/iOS.
 * Single-select, keyboard accessible via radio semantics.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  size = 'default',
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[var(--radius)] bg-[var(--surface-sunken)] p-1',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] font-medium whitespace-nowrap cursor-pointer',
              'transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)]',
              'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--ring)]',
              '[&_svg]:shrink-0',
              size === 'sm' ? 'h-7 px-2.5 text-xs [&_svg]:size-3.5' : 'h-8 px-3 text-sm [&_svg]:size-4',
              active
                ? 'bg-[var(--surface-raised)] text-[var(--text-heading)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
