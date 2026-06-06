import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border border-transparent',
  {
    variants: {
      variant: {
        default:     'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
        secondary:   'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        destructive: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        success:     'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        warning:     'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        info:        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
        math:        'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
        reading:     'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
        outline:     'border-[var(--border)] text-[var(--foreground)] bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
