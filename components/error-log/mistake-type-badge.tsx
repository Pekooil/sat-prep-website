import { BookOpen, Zap, Clock, Target, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MistakeTypeKey = 'concept' | 'careless' | 'time' | 'strategy' | 'other'

interface Config {
  label: string
  icon: React.ElementType
  classes: string
}

export const MISTAKE_CONFIG: Record<MistakeTypeKey, Config> = {
  concept:  { label: 'Concept Gap',    icon: BookOpen,   classes: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300' },
  careless: { label: 'Careless Error', icon: Zap,        classes: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300' },
  time:     { label: 'Timing Issue',   icon: Clock,      classes: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300' },
  strategy: { label: 'Strategy Error', icon: Target,     classes: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-300' },
  other:    { label: 'Other',          icon: HelpCircle, classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300' },
}

interface MistakeTypeBadgeProps {
  type: MistakeTypeKey
  /** Overrides the "Other" label with the user's custom mistake type string. */
  customLabel?: string | null
  size?: 'sm' | 'md'
  className?: string
}

export function MistakeTypeBadge({ type, customLabel, size = 'sm', className }: MistakeTypeBadgeProps) {
  const cfg = MISTAKE_CONFIG[type] ?? MISTAKE_CONFIG.other
  const Icon = cfg.icon
  const label = type === 'other' && customLabel ? customLabel : cfg.label

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      cfg.classes,
      className,
    )}>
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {label}
    </span>
  )
}
