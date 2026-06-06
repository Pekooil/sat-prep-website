import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-[var(--radius)] border border-[var(--input-border)]',
        'bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--foreground)]',
        'placeholder:text-slate-400',
        'transition-[border-color,box-shadow] duration-[var(--dur-normal)]',
        'focus:outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_var(--violet-100)]',
        'dark:focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)]',
        'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
