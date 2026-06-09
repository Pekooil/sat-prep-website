import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-medium transition-colors border border-transparent [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Quiet by default — subtle accent tint, not a loud fill
        default:     'bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]',
        secondary:   'bg-[var(--surface-sunken)] text-[var(--text-body)]',
        destructive: 'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        success:     'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        warning:     'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        info:        'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
        math:        'bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
        reading:     'bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]',
        outline:     'border-[var(--border-strong)] text-[var(--text-body)] bg-transparent',
      },
      size: {
        sm:      'px-2 py-0.5 text-[11px] [&_svg]:size-3',
        default: 'px-2.5 py-0.5 text-xs [&_svg]:size-3.5',
        lg:      'px-3 py-1 text-sm [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
