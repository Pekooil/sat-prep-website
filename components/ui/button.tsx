'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
    'rounded-[var(--radius)] border border-transparent cursor-pointer select-none',
    'transition-[background-color,color,border-color,box-shadow,transform]',
    'duration-[var(--dur-fast)] ease-[var(--ease-out)]',
    'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--ring)]',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:shrink-0 [&_svg]:pointer-events-none',
  ].join(' '),
  {
    variants: {
      variant: {
        // Premium CTA = high-contrast NEUTRAL (near-black on light, near-white on dark)
        default:
          'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-xs)] hover:bg-[var(--primary-hover)]',
        // Accent-filled — reserved; use only when the chromatic accent is the point
        accent:
          'bg-[var(--accent)] text-white shadow-[var(--shadow-xs)] hover:bg-[var(--accent-hover)]',
        destructive:
          'bg-[var(--red-600)] text-white shadow-[var(--shadow-xs)] hover:bg-[color-mix(in_srgb,var(--red-600),#000_12%)]',
        outline:
          'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-body)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-heading)]',
        secondary:
          'bg-[var(--surface-sunken)] text-[var(--text-heading)] hover:bg-[color-mix(in_srgb,var(--surface-sunken)_80%,var(--foreground)_8%)]',
        ghost:
          'text-[var(--text-body)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-heading)]',
        link:
          'text-[var(--accent)] underline-offset-4 hover:underline h-auto p-0 border-0',
      },
      size: {
        sm:      'h-8 px-3 text-xs gap-1.5 [&_svg]:size-4',
        default: 'h-10 px-4 text-sm [&_svg]:size-4',
        lg:      'h-11 px-6 text-base [&_svg]:size-[18px]',
        icon:    'h-10 w-10 [&_svg]:size-[18px]',
        'icon-sm':'h-8 w-8 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
