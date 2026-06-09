import { Check, Target, BarChart2, Sparkles, BookOpen, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { label: 'Goals',       icon: Target,    description: 'Your SAT targets'    },
  { label: 'Performance', icon: BarChart2,  description: 'Practice data'       },
  { label: 'Analysis',    icon: BookOpen,   description: 'Your weak spots'     },
  { label: 'Your Plan',   icon: Sparkles,   description: 'Recommendations'     },
  { label: 'Account',     icon: UserPlus,   description: 'Save your plan'      },
]

interface WizardProgressProps {
  currentStep: number // 1-5
  hideAccountStep?: boolean // for already-authenticated users
}

export function WizardProgress({ currentStep, hideAccountStep = false }: WizardProgressProps) {
  const visibleSteps = hideAccountStep ? STEPS.slice(0, 4) : STEPS
  const totalSteps = visibleSteps.length

  return (
    <div className="w-full">
      {/* Step row */}
      <div className="flex items-center justify-between relative">
        {/* Connecting lines */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-[var(--surface-sunken)] mx-10 z-0" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-[var(--accent)] transition-all duration-500 ease-in-out mx-10 z-0"
          style={{ right: `${((totalSteps - Math.min(currentStep, totalSteps)) / (totalSteps - 1)) * 100}%` }}
        />

        {visibleSteps.map((step, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep
          const isActive = stepNum === currentStep
          const isPending = stepNum > currentStep
          const Icon = step.icon

          return (
            <div key={stepNum} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                  isCompleted && 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-[var(--shadow-xs)]',
                  isActive && 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-[var(--shadow-accent)] scale-110',
                  isPending && 'bg-[var(--surface-raised)] border-[var(--border-strong)] text-[var(--text-muted)]'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="hidden sm:flex flex-col items-center text-center">
                <span
                  className={cn(
                    'text-xs font-semibold leading-none',
                    (isActive || isCompleted) ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                  )}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-none">
                  {step.description}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: current step label */}
      <div className="sm:hidden mt-4 text-center">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Step {currentStep} of {totalSteps} — {visibleSteps[currentStep - 1]?.label}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{visibleSteps[currentStep - 1]?.description}</p>
      </div>
    </div>
  )
}
