import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  [
    'flex w-full rounded-[var(--radius-sm)] border border-[var(--input-border)]',
    'bg-[var(--surface-raised)] text-[var(--foreground)]',
    'placeholder:text-[var(--text-muted)]',
    'transition-[border-color,box-shadow] duration-[var(--dur-fast)]',
    'focus:outline-none focus:border-[var(--accent)]',
    'focus:shadow-[0_0_0_3px_var(--accent-soft)]',
    'disabled:cursor-not-allowed disabled:bg-[var(--surface-sunken)] disabled:opacity-70',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  ].join(' '),
  {
    variants: {
      inputSize: {
        sm:      'h-8 px-2.5 text-xs',
        default: 'h-10 px-3 text-sm',
        lg:      'h-11 px-3.5 text-base',
      },
    },
    defaultVariants: { inputSize: 'default' },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(inputVariants({ inputSize, className }))}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input, inputVariants }
