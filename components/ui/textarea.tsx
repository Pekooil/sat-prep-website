import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[88px] w-full rounded-[var(--radius-sm)] border border-[var(--input-border)]',
        'bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--foreground)]',
        'placeholder:text-[var(--text-muted)] resize-none',
        'transition-[border-color,box-shadow] duration-[var(--dur-fast)]',
        'focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]',
        'disabled:cursor-not-allowed disabled:bg-[var(--surface-sunken)] disabled:opacity-70',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
