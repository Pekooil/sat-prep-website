import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-[var(--input-border)] bg-[var(--card)] px-3 py-2 text-sm',
        'placeholder:text-[var(--muted-foreground)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
