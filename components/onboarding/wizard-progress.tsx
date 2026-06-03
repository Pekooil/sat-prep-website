import { Check, Target, BarChart2, Sparkles, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { label: 'Goals', icon: Target, description: 'Your SAT targets' },
  { label: 'Performance', icon: BarChart2, description: 'Practice data' },
  { label: 'Analysis', icon: BookOpen, description: 'Your weak spots' },
  { label: 'Your Plan', icon: Sparkles, description: 'AI recommendations' },
]

interface WizardProgressProps {
  currentStep: number // 1-4
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  return (
    <div className="w-full">
      {/* Step row */}
      <div className="flex items-center justify-between relative">
        {/* Connecting lines */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 mx-10 z-0" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-blue-500 transition-all duration-500 ease-in-out mx-10 z-0"
          style={{ right: `${((4 - Math.min(currentStep, 4)) / 3) * 100}%` }}
        />

        {STEPS.map((step, i) => {
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
                  isCompleted && 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25',
                  isActive && 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110',
                  isPending && 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
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
                    (isActive || isCompleted) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-none">
                  {step.description}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: current step label */}
      <div className="sm:hidden mt-4 text-center">
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          Step {currentStep} of 4 — {STEPS[currentStep - 1]?.label}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{STEPS[currentStep - 1]?.description}</p>
      </div>
    </div>
  )
}
