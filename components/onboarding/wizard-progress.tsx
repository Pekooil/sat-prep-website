import { Check, Target, Clock, Sparkles, BookOpen, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ONBOARDING_STEPS = [
  { label: 'Goals',     icon: Target,   description: 'Your SAT targets' },
  { label: 'Time',      icon: Clock,    description: 'Your schedule'    },
  { label: 'Overview',  icon: BookOpen, description: 'Plan summary'     },
  { label: 'Your Plan', icon: Sparkles, description: 'Ready to study'   },
  { label: 'Account',   icon: UserPlus, description: 'Save your plan'   },
]

interface WizardProgressProps {
  currentStep: number // 1-5
  hideAccountStep?: boolean // for already-authenticated users
}

/**
 * Vertical stepper — lives in the dark brand rail on desktop. Mirrors the
 * landing-page visual language: hairline track, accent fill, glowing active
 * node, completed checkmarks.
 */
export function WizardStepsVertical({ currentStep, hideAccountStep = false }: WizardProgressProps) {
  const visibleSteps = hideAccountStep ? ONBOARDING_STEPS.slice(0, 4) : ONBOARDING_STEPS

  return (
    <ol className="relative space-y-1">
      {visibleSteps.map((step, i) => {
        const stepNum = i + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep
        const Icon = step.icon
        const isLast = i === visibleSteps.length - 1

        return (
          <li key={stepNum} className="relative flex gap-4 pb-5 last:pb-0">
            {/* Connecting line */}
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-[19px] top-10 bottom-0 w-px transition-colors duration-500',
                  isCompleted ? 'bg-[var(--color-violet-400)]/60' : 'bg-white/10'
                )}
              />
            )}

            {/* Node */}
            <span
              className={cn(
                'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300',
                isCompleted && 'border-[var(--color-violet-400)]/50 bg-[var(--color-violet-500)]/20 text-[var(--color-violet-300)]',
                isActive && 'border-[var(--color-violet-400)] bg-[var(--color-violet-500)] text-white shadow-[0_0_0_4px_rgba(139,92,246,0.18),0_8px_24px_-6px_rgba(139,92,246,0.55)]',
                !isCompleted && !isActive && 'border-white/12 bg-white/[0.03] text-white/35'
              )}
            >
              {isCompleted ? (
                <Check className="h-5 w-5" strokeWidth={2.5} />
              ) : (
                <Icon className="h-[18px] w-[18px]" />
              )}
            </span>

            {/* Label */}
            <div className="min-w-0 pt-1">
              <p
                className={cn(
                  'text-sm font-semibold leading-tight transition-colors duration-300',
                  isActive ? 'text-white' : isCompleted ? 'text-white/80' : 'text-white/40'
                )}
              >
                {step.label}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-xs leading-tight transition-colors duration-300',
                  isActive ? 'text-white/60' : 'text-white/30'
                )}
              >
                {step.description}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Compact horizontal progress — shown above the wizard on mobile, where the
 * dark brand rail is hidden.
 */
export function WizardProgressCompact({ currentStep, hideAccountStep = false }: WizardProgressProps) {
  const visibleSteps = hideAccountStep ? ONBOARDING_STEPS.slice(0, 4) : ONBOARDING_STEPS
  const totalSteps = visibleSteps.length
  const current = visibleSteps[Math.min(currentStep, totalSteps) - 1]
  const Icon = current?.icon ?? Target

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-heading)]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]">
            <Icon className="h-4 w-4" />
          </span>
          {current?.label}
        </span>
        <span className="sp-numeric text-xs font-medium text-[var(--text-muted)]">
          Step {Math.min(currentStep, totalSteps)} of {totalSteps}
        </span>
      </div>
      <div className="flex gap-1.5">
        {visibleSteps.map((_, i) => {
          const n = i + 1
          return (
            <span
              key={n}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                n < currentStep ? 'bg-[var(--accent)]/50' : n === currentStep ? 'bg-[var(--accent)]' : 'bg-[var(--surface-sunken)]'
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
