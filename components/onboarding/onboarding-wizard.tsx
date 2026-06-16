'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2, Rocket, UserPlus, ShieldCheck, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LEGAL, MIN_BIRTH_YEAR, ageFromBirthYear, validateAgeConsent } from '@/lib/legal/config'
import { SaturnPathLogo } from '@/components/layout/saturn-path-logo'
import { BrandRail } from './brand-rail'
import { WizardProgressCompact } from './wizard-progress'
import { Step1Basics } from './step-1-basics'
import { Step2Time } from './step-2-time'
import { Step3Analysis } from './step-3-analysis'
import { Step4Recommendations } from './step-4-recommendations'
import { getOnboardingRecommendations, saveOnboarding, signUpAndSaveOnboarding } from '@/actions/onboarding'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type {
  OnboardingStep1Data,
  OnboardingStep2Data,
  OnboardingAnalysis,
  DomainStat,
  AIOnboardingRec,
  CategoryPerf,
} from '@/types'

export interface Step5AccountData {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  birthYear: string
  agreedToTerms: boolean
  parentalAck: boolean
}

interface Step5AccountProps {
  data: Step5AccountData
  onChange: (d: Step5AccountData) => void
  errors: Partial<Record<keyof Step5AccountData, string>>
}

const CURRENT_YEAR = new Date().getFullYear()
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - MIN_BIRTH_YEAR + 1 }, (_, i) => CURRENT_YEAR - i)

const FIELD_CLASS =
  'flex h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-base)] px-3.5 py-2 text-sm text-[var(--text-heading)] shadow-[var(--shadow-xs)] transition-colors placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30'

function Step5Account({ data, onChange, errors }: Step5AccountProps) {
  function set(field: keyof Step5AccountData, value: string | boolean) {
    onChange({ ...data, [field]: value })
  }
  const age = data.birthYear ? ageFromBirthYear(Number(data.birthYear)) : null
  const needsParental = age !== null && age < LEGAL.parentalConsentBelowAge
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]">
          <UserPlus className="h-6 w-6" />
        </span>
        <h2 className="sp-display text-2xl">Create your account</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Your plan is ready — create a free account to save it and start studying.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="s5-fullname" className="text-sm font-medium text-[var(--text-heading)]">Full Name</label>
          <input
            id="s5-fullname"
            type="text"
            placeholder="Alex Johnson"
            autoComplete="name"
            value={data.fullName}
            onChange={e => set('fullName', e.target.value)}
            className={FIELD_CLASS}
          />
          {errors.fullName && <p className="text-xs text-red-600 dark:text-red-400">{errors.fullName}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="s5-email" className="text-sm font-medium text-[var(--text-heading)]">Email</label>
          <input
            id="s5-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={data.email}
            onChange={e => set('email', e.target.value)}
            className={FIELD_CLASS}
          />
          {errors.email && <p className="text-xs text-red-600 dark:text-red-400">{errors.email}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="s5-password" className="text-sm font-medium text-[var(--text-heading)]">Password</label>
            <input
              id="s5-password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={data.password}
              onChange={e => set('password', e.target.value)}
              className={FIELD_CLASS}
            />
            {errors.password && <p className="text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s5-confirm" className="text-sm font-medium text-[var(--text-heading)]">Confirm Password</label>
            <input
              id="s5-confirm"
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              value={data.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)}
              className={FIELD_CLASS}
            />
            {errors.confirmPassword && <p className="text-xs text-red-600 dark:text-red-400">{errors.confirmPassword}</p>}
          </div>
        </div>

        {/* Age gate */}
        <div className="space-y-1.5">
          <label htmlFor="s5-birthyear" className="text-sm font-medium text-[var(--text-heading)]">Birth year</label>
          <select
            id="s5-birthyear"
            value={data.birthYear}
            onChange={e => set('birthYear', e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="" disabled>Select your birth year</option>
            {BIRTH_YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {errors.birthYear && <p className="text-xs text-red-600 dark:text-red-400">{errors.birthYear}</p>}
        </div>

        {/* Consent */}
        <div className="space-y-2.5">
          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={data.agreedToTerms}
              onChange={e => set('agreedToTerms', e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="underline hover:text-[var(--text-heading)]">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="underline hover:text-[var(--text-heading)]">Privacy Policy</Link>.
            </span>
          </label>
          {errors.agreedToTerms && <p className="text-xs text-red-600 dark:text-red-400">{errors.agreedToTerms}</p>}

          {needsParental && (
            <>
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={data.parentalAck}
                  onChange={e => set('parentalAck', e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <span>I am under 18 and have my parent or guardian's permission to use {LEGAL.appName}.</span>
              </label>
              {errors.parentalAck && <p className="text-xs text-red-600 dark:text-red-400">{errors.parentalAck}</p>}
            </>
          )}
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--accent-soft)] p-3.5 text-xs text-[var(--accent-soft-foreground)]">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Your study data, plan, and progress are saved securely to your account — free forever.</span>
      </div>
    </div>
  )
}

// ─── Defaults ────────────────────────────────────────────────────────────

const EMPTY_PERF: CategoryPerf = { attempted: 0, correct: 0 }

const defaultStep1: OnboardingStep1Data = {
  currentScore: 1050,
  targetScore: 1350,
  testDate: '',
  dailyStudyMinutes: 60,
}

const defaultStep2: OnboardingStep2Data = {
  reading_writing: {
    informationIdeas: { ...EMPTY_PERF },
    craftStructure: { ...EMPTY_PERF },
    expressionIdeas: { ...EMPTY_PERF },
    standardEnglish: { ...EMPTY_PERF },
  },
  math: {
    algebra: { ...EMPTY_PERF },
    advancedMath: { ...EMPTY_PERF },
    problemSolving: { ...EMPTY_PERF },
    geometry: { ...EMPTY_PERF },
  },
}

// ─── Practice Test Count ─────────────────────────────────────────────────

/**
 * Estimate how many Bluebook practice tests will be in the plan.
 * Mirrors the scheduler's practiceTestWeekSet() logic plus the mandatory
 * 2-days-before test that is always added regardless of the biweekly cadence.
 */
function computePracticeTestCount(studyDays: number): number {
  if (studyDays < 3) return 0
  const totalWeeks = Math.ceil(studyDays / 7)
  let biweeklyCount = 0
  for (let w = 2; w <= totalWeeks - 1; w += 2) biweeklyCount++
  return biweeklyCount + 1 // +1 for the mandatory 2-days-before test
}

// ─── Analysis Computation ─────────────────────────────────────────────────

const DOMAIN_DEFS: Array<{
  key: string; label: string; cbDomain: string; subject: 'math' | 'reading_writing'
  getPerf: (d: OnboardingStep2Data) => CategoryPerf
}> = [
  { key: 'informationIdeas', label: 'Information and Ideas', cbDomain: 'Information and Ideas', subject: 'reading_writing', getPerf: d => d.reading_writing.informationIdeas },
  { key: 'craftStructure', label: 'Craft and Structure', cbDomain: 'Craft and Structure', subject: 'reading_writing', getPerf: d => d.reading_writing.craftStructure },
  { key: 'expressionIdeas', label: 'Expression of Ideas', cbDomain: 'Expression of Ideas', subject: 'reading_writing', getPerf: d => d.reading_writing.expressionIdeas },
  { key: 'standardEnglish', label: 'Standard English Conventions', cbDomain: 'Standard English Conventions', subject: 'reading_writing', getPerf: d => d.reading_writing.standardEnglish },
  { key: 'algebra', label: 'Algebra', cbDomain: 'Algebra', subject: 'math', getPerf: d => d.math.algebra },
  { key: 'advancedMath', label: 'Advanced Math', cbDomain: 'Advanced Math', subject: 'math', getPerf: d => d.math.advancedMath },
  { key: 'problemSolving', label: 'Problem-Solving and Data Analysis', cbDomain: 'Problem-Solving and Data Analysis', subject: 'math', getPerf: d => d.math.problemSolving },
  { key: 'geometry', label: 'Geometry and Trigonometry', cbDomain: 'Geometry and Trigonometry', subject: 'math', getPerf: d => d.math.geometry },
]

function computeAnalysis(step1: OnboardingStep1Data, step2: OnboardingStep2Data): OnboardingAnalysis {
  const domains: DomainStat[] = DOMAIN_DEFS.map(def => {
    const { attempted, correct } = def.getPerf(step2)
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0
    const level: DomainStat['level'] =
      attempted === 0 ? 'moderate' :
      accuracy < 55 ? 'weak' :
      accuracy < 75 ? 'moderate' : 'strong'
    return { key: def.key, label: def.label, cbDomain: def.cbDomain, subject: def.subject, attempted, correct, accuracy, level }
  })

  const withData = domains.filter(d => d.attempted > 0)
  const totalAttempted = withData.reduce((s, d) => s + d.attempted, 0)
  const totalCorrect = withData.reduce((s, d) => s + d.correct, 0)
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0

  const weakDomains = domains.filter(d => d.attempted > 0 && d.level === 'weak').sort((a, b) => a.accuracy - b.accuracy)
  const strongDomains = domains.filter(d => d.attempted > 0 && d.level === 'strong').sort((a, b) => b.accuracy - a.accuracy)

  const scoreGap = Math.max(0, step1.targetScore - step1.currentScore)
  const studyDays = step1.testDate
    ? Math.max(0, Math.ceil((new Date(step1.testDate).getTime() - Date.now()) / 86400000))
    : 90

  const estimatedImprovement = Math.min(scoreGap, weakDomains.length * 40 + Math.round(scoreGap * 0.3))
  const practiceTestCount = computePracticeTestCount(studyDays)

  return { domains, weakDomains, strongDomains, totalAttempted, totalCorrect, overallAccuracy, scoreGap, studyDays, estimatedImprovement, practiceTestCount }
}

// ─── Validation ───────────────────────────────────────────────────────────

function validateStep1Scores(data: OnboardingStep1Data) {
  const errors: Partial<Record<keyof OnboardingStep1Data, string>> = {}
  if (data.currentScore < 400 || data.currentScore > 1600)
    errors.currentScore = 'Score must be between 400 and 1600'
  if (data.targetScore < 400 || data.targetScore > 1600)
    errors.targetScore = 'Score must be between 400 and 1600'
  if (data.targetScore <= data.currentScore)
    errors.targetScore = 'Target must be higher than your current score'
  return errors
}

function validateStep2Time(data: OnboardingStep1Data) {
  const errors: Partial<Record<keyof OnboardingStep1Data, string>> = {}
  if (!data.testDate)
    errors.testDate = 'Please enter your SAT test date'
  else if (new Date(data.testDate) <= new Date())
    errors.testDate = 'Test date must be in the future'
  if (data.dailyStudyMinutes < 10)
    errors.dailyStudyMinutes = 'Please select a study time'
  return errors
}

// ─── Main Wizard Component ────────────────────────────────────────────────

const defaultStep5: Step5AccountData = {
  fullName: '', email: '', password: '', confirmPassword: '',
  birthYear: '', agreedToTerms: false, parentalAck: false,
}

function validateStep5(data: Step5AccountData) {
  const errors: Partial<Record<keyof Step5AccountData, string>> = {}
  if (!data.fullName.trim()) errors.fullName = 'Full name is required'
  if (!data.email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address'
  if (data.password.length < 8) errors.password = 'Password must be at least 8 characters'
  if (data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords do not match'

  const birthYear = data.birthYear ? Number(data.birthYear) : null
  const consentError = validateAgeConsent({
    birthYear,
    agreedToTerms: data.agreedToTerms,
    parentalAck: data.parentalAck,
  })
  if (consentError) {
    if (!data.birthYear || (birthYear !== null && ageFromBirthYear(birthYear) < LEGAL.minAge)) {
      errors.birthYear = consentError
    } else if (!data.agreedToTerms) {
      errors.agreedToTerms = consentError
    } else {
      errors.parentalAck = consentError
    }
  }
  return errors
}

interface OnboardingWizardProps {
  isAuthenticated?: boolean
}

export function OnboardingWizard({ isAuthenticated = false }: OnboardingWizardProps) {
  const router = useRouter()
  const { toast } = useToast()

  const totalSteps = isAuthenticated ? 4 : 5

  const [step, setStep] = React.useState(1)
  const [step1Data, setStep1Data] = React.useState<OnboardingStep1Data>(defaultStep1)
  const [step5Data, setStep5Data] = React.useState<Step5AccountData>(defaultStep5)
  const [step1Errors, setStep1Errors] = React.useState<Partial<Record<keyof OnboardingStep1Data, string>>>({})
  const [step5Errors, setStep5Errors] = React.useState<Partial<Record<keyof Step5AccountData, string>>>({})
  const [analysis, setAnalysis] = React.useState<OnboardingAnalysis | null>(null)
  const [aiRecs, setAiRecs] = React.useState<AIOnboardingRec | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [direction, setDirection] = React.useState<'forward' | 'back'>('forward')
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false)

  async function handleNext() {
    if (step === 1) {
      const errs = validateStep1Scores(step1Data)
      if (Object.keys(errs).length > 0) { setStep1Errors(errs); return }
      setStep1Errors({})
      setDirection('forward')
      setStep(2)
    } else if (step === 2) {
      const errs = validateStep2Time(step1Data)
      if (Object.keys(errs).length > 0) { setStep1Errors(errs); return }
      setStep1Errors({})
      const computed = computeAnalysis(step1Data, defaultStep2)
      setAnalysis(computed)
      setDirection('forward')
      setStep(3)
    } else if (step === 3) {
      setDirection('forward')
      setStep(4)
      setAiLoading(true)
      setAiError(null)
      const computed = analysis ?? computeAnalysis(step1Data, defaultStep2)
      const result = await getOnboardingRecommendations(step1Data, computed)
      setAiLoading(false)
      if (result.error) {
        setAiError(result.error)
      } else {
        setAiRecs(result.data ?? null)
      }
    } else if (step === 4 && !isAuthenticated) {
      setDirection('forward')
      setStep(5)
    }
  }

  function handleBack() {
    setDirection('back')
    setStep1Errors({})
    setStep(s => Math.max(1, s - 1))
  }

  async function handleRetryAI() {
    if (!analysis) return
    setAiLoading(true)
    setAiError(null)
    const result = await getOnboardingRecommendations(step1Data, analysis)
    setAiLoading(false)
    if (result.error) setAiError(result.error)
    else setAiRecs(result.data ?? null)
  }

  async function handleComplete() {
    const computed = analysis ?? computeAnalysis(step1Data, defaultStep2)

    if (!isAuthenticated) {
      const errs = validateStep5(step5Data)
      if (Object.keys(errs).length > 0) { setStep5Errors(errs); return }
      setStep5Errors({})
    }

    setSaving(true)
    try {
      if (isAuthenticated) {
        const result = await saveOnboarding(step1Data, defaultStep2, computed, aiRecs)
        if (result.error) {
          toast({ title: 'Error saving data', description: result.error, variant: 'destructive' })
          return
        }
      } else {
        const result = await signUpAndSaveOnboarding(
          {
            email: step5Data.email,
            password: step5Data.password,
            fullName: step5Data.fullName,
            birthYear: Number(step5Data.birthYear),
            agreedToTerms: step5Data.agreedToTerms,
            parentalAck: step5Data.parentalAck,
          },
          step1Data, defaultStep2, computed, aiRecs,
        )
        if (result.needsConfirmation) {
          setNeedsConfirmation(true)
          return
        }
        if (result.error) {
          toast({ title: 'Error creating account', description: result.error, variant: 'destructive' })
          return
        }
      }

      toast({ title: 'Setup complete!', description: 'Welcome to SaturnPath. Your plan is ready.' })
      router.push('/home')
      router.refresh()
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Please try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const isLastStep = isAuthenticated ? step === 4 : step === 5
  const canGoBack = step > 1

  if (needsConfirmation) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
        {/* Quiet accent glow backdrop */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/2 top-[-8rem] h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--accent)] opacity-[0.08] blur-[120px]" />
        </div>
        <div className="relative z-10 w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center shadow-[var(--shadow-lg)]">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <MailCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </span>
          <h2 className="sp-display text-2xl">Check your email</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--text-muted)]">
            We sent a confirmation link to <strong className="text-[var(--text-heading)]">{step5Data.email}</strong>. Click it to activate your account, then sign in.
          </p>
          <Button asChild className="mt-6">
            <a href="/login">Back to sign in</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* ── Left brand rail (desktop) — dark, step-aware ── */}
      <BrandRail currentStep={step} hideAccountStep={isAuthenticated} />

      {/* ── Right wizard panel ── */}
      <div className="relative flex min-h-screen flex-1 flex-col bg-[var(--surface-base)] lg:h-screen lg:min-h-0">
        {/* Quiet accent glow, top-right */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden" aria-hidden="true">
          <div className="absolute right-[-6rem] top-[-8rem] h-72 w-72 rounded-full bg-[var(--accent)] opacity-[0.06] blur-[120px]" />
        </div>

        {/* Mobile header: logo + compact progress */}
        <div className="relative z-10 space-y-4 border-b border-[var(--border)] px-5 py-5 sm:px-8 lg:hidden">
          <SaturnPathLogo size="sm" asLink={false} />
          <WizardProgressCompact currentStep={step} hideAccountStep={isAuthenticated} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-14 lg:py-12">
          <div className="mx-auto w-full max-w-xl">
            <div
              key={step}
              className={cn(
                'animate-in duration-300',
                direction === 'forward' ? 'slide-in-from-right-4 fade-in-0' : 'slide-in-from-left-4 fade-in-0'
              )}
            >
              {step === 1 && (
                <Step1Basics
                  data={step1Data}
                  onChange={setStep1Data}
                  errors={step1Errors}
                />
              )}
              {step === 2 && (
                <Step2Time
                  data={step1Data}
                  onChange={setStep1Data}
                  errors={step1Errors}
                />
              )}
              {step === 3 && analysis && (
                <Step3Analysis
                  analysis={analysis}
                  step1CurrentScore={step1Data.currentScore}
                  step1TargetScore={step1Data.targetScore}
                  dailyStudyMinutes={step1Data.dailyStudyMinutes}
                />
              )}
              {step === 4 && (
                <Step4Recommendations
                  aiRecs={aiRecs}
                  loading={aiLoading}
                  error={aiError}
                  analysis={analysis ?? computeAnalysis(step1Data, defaultStep2)}
                  dailyStudyMinutes={step1Data.dailyStudyMinutes}
                  onRetry={handleRetryAI}
                />
              )}
              {step === 5 && !isAuthenticated && (
                <Step5Account
                  data={step5Data}
                  onChange={setStep5Data}
                  errors={step5Errors}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer navigation */}
        <div className="relative z-10 border-t border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4 sm:px-8 lg:px-14">
          <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={!canGoBack || saving}
              className={cn(!canGoBack && 'invisible')}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>

            {/* Step counter (mobile) */}
            <span className="sp-numeric text-xs font-medium text-[var(--text-muted)] sm:hidden">
              {Math.min(step, totalSteps)} / {totalSteps}
            </span>

            {isLastStep ? (
              <div className={cn('ai-planner-frame ai-planner-frame-sm inline-flex transition-opacity', (saving || aiLoading) && 'opacity-50')}>
                <div className="ai-planner-frame-inner bg-transparent">
                  <Button
                    onClick={handleComplete}
                    disabled={saving || aiLoading}
                    className="min-w-[140px] gap-2 bg-black text-violet-300 hover:bg-zinc-900 disabled:opacity-100"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        {isAuthenticated ? 'Start My Journey' : 'Create Account & Start'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleNext}
                className="min-w-[100px] gap-1"
              >
                {step === 3 ? 'Get My Plan' : step === 4 && !isAuthenticated ? 'Create Account' : 'Next'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
