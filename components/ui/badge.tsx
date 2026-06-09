import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-semibold transition-colors border border-transparent [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:     'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
        secondary:   'bg-[var(--surface-sunken)] text-[var(--text-body)]',
        destructive: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        success:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        warning:     'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        info:        'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
        math:        'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
        reading:     'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
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
