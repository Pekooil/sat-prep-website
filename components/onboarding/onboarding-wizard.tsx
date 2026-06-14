'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Rocket, UserPlus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LEGAL, MIN_BIRTH_YEAR, ageFromBirthYear, validateAgeConsent } from '@/lib/legal/config'
import { WizardProgress } from './wizard-progress'
import { Step1Basics } from './step-1-basics'
import { Step2Performance } from './step-2-performance'
import { Step3Analysis } from './step-3-analysis'
import { Step4Recommendations } from './step-4-recommendations'
import { getOnboardingRecommendations, saveOnboarding, signUpAndSaveOnboarding } from '@/actions/onboarding'
// ─── Step 5 types + component (inlined to avoid separate-file hot-reload issues) ─
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

function Step5Account({ data, onChange, errors }: Step5AccountProps) {
  function set(field: keyof Step5AccountData, value: string | boolean) {
    onChange({ ...data, [field]: value })
  }
  const age = data.birthYear ? ageFromBirthYear(Number(data.birthYear)) : null
  const needsParental = age !== null && age < LEGAL.parentalConsentBelowAge
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Create your account</h2>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Your plan is ready — create a free account to save it and start studying.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="s5-fullname" className="text-sm font-medium text-[var(--foreground)]">Full Name</label>
          <input
            id="s5-fullname"
            type="text"
            placeholder="Alex Johnson"
            autoComplete="name"
            value={data.fullName}
            onChange={e => set('fullName', e.target.value)}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-background placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          />
          {errors.fullName && <p className="text-xs text-red-600 dark:text-red-400">{errors.fullName}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="s5-email" className="text-sm font-medium text-[var(--foreground)]">Email</label>
          <input
            id="s5-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={data.email}
            onChange={e => set('email', e.target.value)}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-background placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          />
          {errors.email && <p className="text-xs text-red-600 dark:text-red-400">{errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="s5-password" className="text-sm font-medium text-[var(--foreground)]">Password</label>
          <input
            id="s5-password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={data.password}
            onChange={e => set('password', e.target.value)}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-background placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          />
          {errors.password && <p className="text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="s5-confirm" className="text-sm font-medium text-[var(--foreground)]">Confirm Password</label>
          <input
            id="s5-confirm"
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            value={data.confirmPassword}
            onChange={e => set('confirmPassword', e.target.value)}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-background placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          />
          {errors.confirmPassword && <p className="text-xs text-red-600 dark:text-red-400">{errors.confirmPassword}</p>}
        </div>

        {/* Age gate */}
        <div className="space-y-1.5">
          <label htmlFor="s5-birthyear" className="text-sm font-medium text-[var(--foreground)]">Birth year</label>
          <select
            id="s5-birthyear"
            value={data.birthYear}
            onChange={e => set('birthYear', e.target.value)}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            <option value="" disabled>Select your birth year</option>
            {BIRTH_YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {errors.birthYear && <p className="text-xs text-red-600 dark:text-red-400">{errors.birthYear}</p>}
        </div>

        {/* Consent */}
        <div className="space-y-2">
          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
            <input
              type="checkbox"
              checked={data.agreedToTerms}
              onChange={e => set('agreedToTerms', e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="underline hover:text-[var(--foreground)]">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="underline hover:text-[var(--foreground)]">Privacy Policy</Link>.
            </span>
          </label>
          {errors.agreedToTerms && <p className="text-xs text-red-600 dark:text-red-400">{errors.agreedToTerms}</p>}

          {needsParental && (
            <>
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={data.parentalAck}
                  onChange={e => set('parentalAck', e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
                />
                <span>I am under 18 and have my parent or guardian’s permission to use {LEGAL.appName}.</span>
              </label>
              {errors.parentalAck && <p className="text-xs text-red-600 dark:text-red-400">{errors.parentalAck}</p>}
            </>
          )}
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 p-3.5 text-xs text-violet-700 dark:text-violet-300">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-violet-500" />
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

  // Rough improvement estimate: each mastered weak area ≈ 30-50 pts
  const estimatedImprovement = Math.min(scoreGap, weakDomains.length * 40 + Math.round(scoreGap * 0.3))

  return { domains, weakDomains, strongDomains, totalAttempted, totalCorrect, overallAccuracy, scoreGap, studyDays, estimatedImprovement }
}

// ─── Validation ───────────────────────────────────────────────────────────

function validateStep1(data: OnboardingStep1Data) {
  const errors: Partial<Record<keyof OnboardingStep1Data, string>> = {}
  if (data.currentScore < 400 || data.currentScore > 1600)
    errors.currentScore = 'Score must be between 400 and 1600'
  if (data.targetScore < 400 || data.targetScore > 1600)
    errors.targetScore = 'Score must be between 400 and 1600'
  if (data.targetScore <= data.currentScore)
    errors.targetScore = 'Target must be higher than your current score'
  if (!data.testDate)
    errors.testDate = 'Please enter your SAT test date'
  else if (new Date(data.testDate) <= new Date())
    errors.testDate = 'Test date must be in the future'
  if (data.dailyStudyMinutes < 10)
    errors.dailyStudyMinutes = 'Please select a study time'
  return errors
}

function validateStep2(data: OnboardingStep2Data) {
  const errors: Record<string, string> = {}
  const allPerfs = [
    ...Object.entries(data.reading_writing).map(([k, v]) => ({ prefix: 'rw', key: k, ...v })),
    ...Object.entries(data.math).map(([k, v]) => ({ prefix: 'math', key: k, ...v })),
  ]
  for (const p of allPerfs) {
    if (p.correct > p.attempted && p.attempted > 0) {
      errors[`${p.prefix}_${p.key}`] = 'Correct cannot exceed attempted'
    }
    if (p.attempted < 0 || p.correct < 0) {
      errors[`${p.prefix}_${p.key}`] = 'Values cannot be negative'
    }
  }
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

  // Age gate + consent — mirrors the authoritative server check (validateAgeConsent).
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
  const [step2Data, setStep2Data] = React.useState<OnboardingStep2Data>(defaultStep2)
  const [step5Data, setStep5Data] = React.useState<Step5AccountData>(defaultStep5)
  const [step1Errors, setStep1Errors] = React.useState<Partial<Record<keyof OnboardingStep1Data, string>>>({})
  const [step2Errors, setStep2Errors] = React.useState<Record<string, string>>({})
  const [step5Errors, setStep5Errors] = React.useState<Partial<Record<keyof Step5AccountData, string>>>({})
  const [analysis, setAnalysis] = React.useState<OnboardingAnalysis | null>(null)
  const [aiRecs, setAiRecs] = React.useState<AIOnboardingRec | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState<string | null>(null)
  const [saving, setSaving]   = React.useState(false)
  const [direction, setDirection] = React.useState<'forward' | 'back'>('forward')
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false)

  async function handleNext() {
    if (step === 1) {
      const errs = validateStep1(step1Data)
      if (Object.keys(errs).length > 0) { setStep1Errors(errs); return }
      setStep1Errors({})
      setDirection('forward')
      setStep(2)
    } else if (step === 2) {
      const errs = validateStep2(step2Data)
      if (Object.keys(errs).length > 0) { setStep2Errors(errs); return }
      setStep2Errors({})
      const computed = computeAnalysis(step1Data, step2Data)
      setAnalysis(computed)
      setDirection('forward')
      setStep(3)
    } else if (step === 3) {
      // Kick off AI recommendations in parallel with transition
      setDirection('forward')
      setStep(4)
      setAiLoading(true)
      setAiError(null)
      const computed = analysis ?? computeAnalysis(step1Data, step2Data)
      const result = await getOnboardingRecommendations(step1Data, computed)
      setAiLoading(false)
      if (result.error) {
        setAiError(result.error)
      } else {
        setAiRecs(result.data ?? null)
      }
    } else if (step === 4 && !isAuthenticated) {
      // Move to account creation step
      setDirection('forward')
      setStep(5)
    }
  }

  function handleBack() {
    setDirection('back')
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
    const computed = analysis ?? computeAnalysis(step1Data, step2Data)

    // Validate account fields up front for the unauthenticated path.
    if (!isAuthenticated) {
      const errs = validateStep5(step5Data)
      if (Object.keys(errs).length > 0) { setStep5Errors(errs); return }
      setStep5Errors({})
    }

    setSaving(true)
    try {
      if (isAuthenticated) {
        // Already signed in — just save
        const result = await saveOnboarding(step1Data, step2Data, computed, aiRecs)
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
          step1Data, step2Data, computed, aiRecs,
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
      // Surface unexpected server-action failures (e.g. a misconfigured
      // environment) instead of leaving the button stuck on "Saving…".
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

  // Email confirmation state — shown instead of wizard after successful signup
  if (needsConfirmation) {
    return (
      <div className="flex flex-col min-h-full items-center justify-center px-6 py-12 text-center space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 mx-auto">
          <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Check your email</h2>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xs">
          We sent a confirmation link to <strong>{step5Data.email}</strong>. Click it to activate your account, then sign in.
        </p>
        <a
          href="/login"
          className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
        >
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Progress */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
        <WizardProgress currentStep={step} hideAccountStep={isAuthenticated} />
      </div>

      {/* Content with animated transition */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
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
            <Step2Performance
              data={step2Data}
              onChange={setStep2Data}
              errors={step2Errors}
            />
          )}
          {step === 3 && analysis && (
            <Step3Analysis
              analysis={analysis}
              step1CurrentScore={step1Data.currentScore}
              step1TargetScore={step1Data.targetScore}
            />
          )}
          {step === 4 && (
            <Step4Recommendations
              aiRecs={aiRecs}
              loading={aiLoading}
              error={aiError}
              analysis={analysis ?? computeAnalysis(step1Data, step2Data)}
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

      {/* Footer navigation */}
      <div className="px-6 pb-6 pt-4 border-t border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between gap-3">
          {/* Back button */}
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={!canGoBack || saving}
            className={cn(!canGoBack && 'invisible')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {/* Step indicator (mobile) */}
          <div className="flex gap-1.5 sm:hidden">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
              <div
                key={s}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  s === step ? 'w-6 bg-violet-600' : s < step ? 'w-1.5 bg-violet-300' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                )}
              />
            ))}
          </div>

          {/* Next / Complete button */}
          {isLastStep ? (
            <Button
              onClick={handleComplete}
              disabled={saving || aiLoading}
              className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25 min-w-[140px]"
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
          ) : (
            <Button
              onClick={handleNext}
              className="gap-1 min-w-[100px]"
            >
              {step === 3 ? 'Get My Plan' : step === 4 && !isAuthenticated ? 'Create Account' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Skip step 2 */}
        {step === 2 && (
          <p className="text-center mt-3 text-xs text-slate-400">
            No practice data yet?{' '}
            <button
              className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
              onClick={handleNext}
            >
              Skip this step
            </button>
          </p>
        )}


      </div>
    </div>
  )
}
