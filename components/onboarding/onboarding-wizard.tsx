'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WizardProgress } from './wizard-progress'
import { Step1Basics } from './step-1-basics'
import { Step2Performance } from './step-2-performance'
import { Step3Analysis } from './step-3-analysis'
import { Step4Recommendations } from './step-4-recommendations'
import { getOnboardingRecommendations, saveOnboarding } from '@/actions/onboarding'
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

export function OnboardingWizard() {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = React.useState(1)
  const [step1Data, setStep1Data] = React.useState<OnboardingStep1Data>(defaultStep1)
  const [step2Data, setStep2Data] = React.useState<OnboardingStep2Data>(defaultStep2)
  const [step1Errors, setStep1Errors] = React.useState<Partial<Record<keyof OnboardingStep1Data, string>>>({})
  const [step2Errors, setStep2Errors] = React.useState<Record<string, string>>({})
  const [analysis, setAnalysis] = React.useState<OnboardingAnalysis | null>(null)
  const [aiRecs, setAiRecs] = React.useState<AIOnboardingRec | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiError, setAiError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [direction, setDirection] = React.useState<'forward' | 'back'>('forward')

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
    setSaving(true)
    const computed = analysis ?? computeAnalysis(step1Data, step2Data)
    const result = await saveOnboarding(step1Data, step2Data, computed, aiRecs)
    setSaving(false)
    if (result.error) {
      toast({ title: 'Error saving data', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: '🎉 Setup complete!', description: 'Welcome to SaturnPath. Your plan is ready.' })
    router.push('/home')
    router.refresh()
  }

  const isLastStep = step === 4
  const canGoBack = step > 1

  return (
    <div className="flex flex-col min-h-full">
      {/* Progress */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
        <WizardProgress currentStep={step} />
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
            {[1, 2, 3, 4].map(s => (
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
                  Start My Journey
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="gap-1 min-w-[100px]"
            >
              {step === 3 ? 'Get My Plan' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Skip option */}
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
