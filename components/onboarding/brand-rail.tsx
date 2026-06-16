import { ShieldCheck } from 'lucide-react'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'
import { WizardStepsVertical } from './wizard-progress'

/** Per-step copy for the dark brand rail headline. Indexed 1-5. */
const RAIL_COPY: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'Set your target.',     subtitle: 'Tell us where you are and where you want to be.' },
  2: { title: 'Plan your time.',      subtitle: 'Your test date and daily rhythm shape the schedule.' },
  3: { title: "Here's your roadmap.", subtitle: 'A preview of the plan we are building around you.' },
  4: { title: 'Your plan is ready.',  subtitle: 'A personalized, day-by-day schedule — built for you.' },
  5: { title: 'Save your progress.',  subtitle: 'Create a free account to lock in your plan forever.' },
}

interface BrandRailProps {
  currentStep: number
  hideAccountStep?: boolean
}

export function BrandRail({ currentStep, hideAccountStep = false }: BrandRailProps) {
  const copy = RAIL_COPY[currentStep] ?? RAIL_COPY[1]

  return (
    <aside className="relative hidden shrink-0 select-none overflow-hidden bg-[#0a0a0a] lg:flex lg:h-screen lg:w-[42%] lg:max-w-xl lg:flex-col lg:justify-between lg:overflow-y-auto lg:p-12 xl:p-14">
      {/* Hairline orbit texture + one restrained accent glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-8rem] h-[560px] w-[560px] -translate-x-1/2 rounded-full border border-white/[0.05]" />
        <div className="absolute left-1/2 top-[-5rem] h-[400px] w-[400px] -translate-x-1/2 rounded-full border border-white/[0.05]" />
        <div className="absolute left-1/2 top-[2rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--color-violet-500)] opacity-20 blur-[120px]" />

        {/* Glowing Saturn mark — deliberate bottom-right corner bleed, low
            opacity so it reads as ambient brand texture behind the content. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt=""
          aria-hidden="true"
          className="lp-float absolute -bottom-20 -right-20 h-72 w-72 opacity-[0.10] xl:h-80 xl:w-80"
          style={{
            filter:
              'brightness(0) invert(1) drop-shadow(0 0 14px rgba(255,255,255,0.4)) drop-shadow(0 0 38px rgba(196,132,252,0.3))',
          }}
        />
      </div>

      {/* Top — logo */}
      <div className="relative z-10">
        <SaturnPathLogo variant="dark" size="md" asLink={false} pathColor="var(--color-violet-400)" />
      </div>

      {/* Middle — dynamic headline + vertical stepper */}
      <div className="relative z-10 my-10">
        <div key={currentStep} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <h1 className="text-3xl font-semibold leading-tight tracking-[var(--tracking-tight)] text-white xl:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
            {copy.subtitle}
          </p>
        </div>

        <div className="mt-10">
          <WizardStepsVertical currentStep={currentStep} hideAccountStep={hideAccountStep} />
        </div>
      </div>

      {/* Bottom — trust line */}
      <div className="relative z-10 flex items-start gap-2.5 text-xs leading-relaxed text-white/45">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-violet-400)]" />
        <span>Your data is private and protected. No SAT questions are ever stored.</span>
      </div>
    </aside>
  )
}
