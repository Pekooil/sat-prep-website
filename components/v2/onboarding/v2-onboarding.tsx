'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  PencilRuler,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

import styles from './v2-onboarding.module.css'

type FieldErrors = Record<string, string>

interface ApiError {
  message: string
  fieldErrors?: Record<string, string[]>
}

interface Bootstrap {
  profile: {
    currentScore: number | null
    fullName: string | null
    onboardingComplete: boolean
    scratchAnalysisEnabled: boolean
    targetScore: number | null
    testDate: string | null
    timingAccommodationMultiplier: number
  }
}

interface OnboardingForm {
  currentScore: string
  fullName: string
  scratchAnalysisEnabled: boolean
  targetScore: string
  testDate: string
  timingAccommodationMultiplier: string
}

interface StepDefinition {
  eyebrow: string
  icon: LucideIcon
  label: string
  title: string
}

const STEPS: StepDefinition[] = [
  { eyebrow: 'Your destination', icon: Target, label: 'Goal', title: 'Give your path a starting point.' },
  { eyebrow: 'Your timing', icon: Clock3, label: 'Timing', title: 'Choose the support that fits you.' },
  { eyebrow: 'Your workspace', icon: PencilRuler, label: 'Tools', title: 'Choose how SaturnPath supports your thinking.' },
  { eyebrow: 'Ready to adapt', icon: ShieldCheck, label: 'Review', title: 'One last check, then your path is ready.' },
]

function initialForm(previewMode = false): OnboardingForm {
  return {
    currentScore: previewMode ? '1100' : '',
    fullName: previewMode ? 'Preview Student' : '',
    scratchAnalysisEnabled: false,
    targetScore: previewMode ? '1400' : '',
    testDate: previewMode ? '2027-03-13' : '',
    timingAccommodationMultiplier: '1',
  }
}

function Brand() {
  return (
    <span className={styles.brand}>
      <span className={styles.brandMark} aria-hidden="true"><span /></span>
      <span>SaturnPath</span>
    </span>
  )
}

function FormError({ children }: { children?: string }) {
  if (!children) return null
  return <p className={styles.fieldError} role="alert">{children}</p>
}

function Toggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={styles.toggleRow}>
      <span><strong>{label}</strong><small>{description}</small></span>
      <input
        checked={checked}
        className={styles.toggleInput}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className={styles.toggleTrack} aria-hidden="true"><span /></span>
    </label>
  )
}

export function V2Onboarding({ previewMode = false }: { previewMode?: boolean }) {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  const [form, setForm] = React.useState<OnboardingForm>(() => initialForm(previewMode))
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [loading, setLoading] = React.useState(!previewMode)
  const [saving, setSaving] = React.useState(false)
  const [complete, setComplete] = React.useState(false)
  const [requestError, setRequestError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (previewMode) return
    let active = true

    async function loadProfile() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session expired. Sign in again to continue.')

      const response = await fetch('/api/v2/bootstrap', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) {
        const error = await response.json() as ApiError
        throw new Error(error.message)
      }

      const { profile } = await response.json() as Bootstrap
      if (!active) return
      setForm({
        currentScore: profile.currentScore?.toString() ?? '',
        fullName: profile.fullName ?? '',
        scratchAnalysisEnabled: profile.scratchAnalysisEnabled,
        targetScore: profile.targetScore?.toString() ?? '',
        testDate: profile.testDate ?? '',
        timingAccommodationMultiplier: profile.timingAccommodationMultiplier.toString(),
      })
      setComplete(profile.onboardingComplete)
    }

    loadProfile()
      .catch((error: unknown) => {
        if (active) setRequestError(error instanceof Error ? error.message : 'Could not load your setup.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [previewMode])

  const update = <Key extends keyof OnboardingForm>(key: Key, value: OnboardingForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function validateStep(): boolean {
    const nextErrors: FieldErrors = {}

    if (step === 0) {
      const current = Number(form.currentScore)
      const target = Number(form.targetScore)
      if (!form.fullName.trim()) nextErrors.fullName = 'Enter your name.'
      if (!Number.isInteger(current) || current < 400 || current > 1600) {
        nextErrors.currentScore = 'Enter a score from 400 to 1600.'
      }
      if (!Number.isInteger(target) || target < current || target > 1600) {
        nextErrors.targetScore = 'Choose a target at or above your current score.'
      }
      if (!form.testDate) nextErrors.testDate = 'Choose your SAT date.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function nextStep() {
    if (!validateStep()) return
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  async function saveProfile() {
    if (!validateStep()) return
    if (previewMode) {
      setComplete(true)
      return
    }
    setSaving(true)
    setRequestError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session expired. Sign in again to continue.')

      const body = {
        currentScore: Number(form.currentScore),
        fullName: form.fullName.trim(),
        scratchAnalysisEnabled: form.scratchAnalysisEnabled,
        targetScore: Number(form.targetScore),
        testDate: form.testDate,
        timingAccommodationMultiplier: Number(form.timingAccommodationMultiplier),
      }
      const response = await fetch('/api/v2/profile', {
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        method: 'PATCH',
      })

      if (!response.ok) {
        const error = await response.json() as ApiError
        if (error.fieldErrors) {
          setErrors(Object.fromEntries(
            Object.entries(error.fieldErrors).map(([field, messages]) => [field, messages[0] ?? 'Check this value.']),
          ))
        }
        throw new Error(error.message)
      }

      setComplete(true)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not save your setup.')
    } finally {
      setSaving(false)
    }
  }

  const currentStep = STEPS[step]
  const CurrentIcon = currentStep.icon
  if (loading) {
    return (
      <main className={styles.canvas} id="main-content" data-product-version="v2">
        <div className={styles.loadingCard} role="status">
          <span className={styles.loadingOrb}><Sparkles aria-hidden="true" /></span>
          <strong>Finding your path…</strong>
          <span>Loading the setup already connected to your account.</span>
        </div>
      </main>
    )
  }

  if (complete) {
    return (
      <main className={styles.canvas} id="main-content" data-product-version="v2">
        <div className={styles.auroraOne} /><div className={styles.auroraTwo} />
        <section className={styles.completeCard}>
          <Brand />
          <span className={styles.completeIcon}><Check aria-hidden="true" /></span>
          <p className={styles.eyebrow}>Setup saved</p>
          <h1>Your adaptive path has a starting point.</h1>
          <p>Your score goal, test date, timing support, and practice preferences are ready for SaturnPath V2.</p>
          <div className={styles.completeStats}>
            <span><small>Current</small><strong>{form.currentScore || '—'}</strong></span>
            <span><small>Target</small><strong>{form.targetScore || '—'}</strong></span>
            <span><small>Practice style</small><strong>Short + adaptive</strong></span>
          </div>
          <button className={styles.primaryButton} onClick={() => { router.push('/home'); router.refresh() }} type="button">
            Open Today <span><ArrowRight aria-hidden="true" /></span>
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.canvas} id="main-content" data-product-version="v2">
      <div className={styles.auroraOne} /><div className={styles.auroraTwo} />
      <aside className={styles.rail}>
        <Brand />
        <div className={styles.railCopy}>
          <span className={styles.railIcon}><CurrentIcon aria-hidden="true" /></span>
          <p>{currentStep.eyebrow}</p>
          <h2>{currentStep.title}</h2>
          <span>Four focused steps. About two minutes.</span>
        </div>
        <div className={styles.pathPreview}>
          <div><Target aria-hidden="true" /><span><small>Your target</small><strong>{form.targetScore || 'Not set'}</strong></span></div>
          <div><Clock3 aria-hidden="true" /><span><small>Session style</small><strong>Short + adaptive</strong></span></div>
          <div><Sparkles aria-hidden="true" /><span><small>Cost</small><strong>Completely free</strong></span></div>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.mobileHeader}><Brand /><span>V2 setup</span></header>
        <nav className={styles.progress} aria-label="Onboarding progress">
          {STEPS.map(({ icon: Icon, label }, index) => (
            <button
              aria-current={index === step ? 'step' : undefined}
              aria-label={`${label}, step ${index + 1}${index < step ? ', completed' : ''}`}
              className={index === step ? styles.stepActive : index < step ? styles.stepComplete : styles.step}
              disabled={index > step}
              key={label}
              onClick={() => setStep(index)}
              type="button"
            >
              <span>{index < step ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
              <small>{label}</small>
            </button>
          ))}
        </nav>

        <form className={styles.formCard} onSubmit={(event) => event.preventDefault()}>
          <div className={styles.formIntro}>
            <span className={styles.stepCount}>Step {step + 1} of {STEPS.length}</span>
            <p className={styles.eyebrow}>{currentStep.eyebrow}</p>
            <h1>{currentStep.title}</h1>
          </div>

          {requestError && <div className={styles.requestError} role="alert">{requestError}</div>}

          {step === 0 && (
            <div className={styles.fields}>
              <label className={styles.field}>
                <span>Your name</span>
                <input autoComplete="name" onChange={(event) => update('fullName', event.target.value)} value={form.fullName} />
                <FormError>{errors.fullName}</FormError>
              </label>
              <div className={styles.twoColumns}>
                <label className={styles.field}>
                  <span>Current SAT score</span>
                  <input inputMode="numeric" max="1600" min="400" onChange={(event) => update('currentScore', event.target.value)} type="number" value={form.currentScore} />
                  <FormError>{errors.currentScore}</FormError>
                </label>
                <label className={styles.field}>
                  <span>Target SAT score</span>
                  <input inputMode="numeric" max="1600" min="400" onChange={(event) => update('targetScore', event.target.value)} type="number" value={form.targetScore} />
                  <FormError>{errors.targetScore}</FormError>
                </label>
              </div>
              <label className={styles.field}>
                <span>Planned SAT date</span>
                <span className={styles.inputWithIcon}><CalendarDays aria-hidden="true" /><input min={new Date().toISOString().slice(0, 10)} onChange={(event) => update('testDate', event.target.value)} type="date" value={form.testDate} /></span>
                <FormError>{errors.testDate}</FormError>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className={styles.fields}>
              <div className={styles.choiceGroup}>
                <span>Timing accommodation</span>
                <div className={styles.segmented}>
                  {[['1', 'Standard'], ['1.5', 'Time + 50%'], ['2', 'Double time']].map(([value, label]) => (
                    <button className={form.timingAccommodationMultiplier === value ? styles.segmentActive : ''} key={value} onClick={() => update('timingAccommodationMultiplier', value)} type="button">{label}</button>
                  ))}
                </div>
              </div>
              <div className={styles.featurePanel}>
                <span className={styles.featureIcon}><Clock3 aria-hidden="true" /></span>
                <div><strong>Your pace stays personal</strong><p>Question timing and pacing guidance will use this multiplier throughout every adaptive session.</p></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.fields}>
              <div className={styles.featurePanel}>
                <span className={styles.featureIcon}><PencilRuler aria-hidden="true" /></span>
                <div><strong>Optional scratch analysis</strong><p>SaturnPath can use structured signals—like whether you erased often or opened the calculator—to improve pacing feedback. Your actual handwriting and drawings are never stored.</p></div>
              </div>
              <Toggle checked={form.scratchAnalysisEnabled} description="You can change this at any time. The production kill switch stays in control." label="Use scratch-work signals" onChange={(value) => update('scratchAnalysisEnabled', value)} />
              <div className={styles.privacyNote}><ShieldCheck aria-hidden="true" /><span><strong>Built for privacy</strong><small>No raw scratch images. No handwritten content. Only compact interaction counts when you opt in.</small></span></div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.fields}>
              <div className={styles.reviewGrid}>
                <span><small>Score path</small><strong>{form.currentScore} → {form.targetScore}</strong></span>
                <span><small>Test date</small><strong>{form.testDate || 'Not set'}</strong></span>
                <span><small>Timing</small><strong>{form.timingAccommodationMultiplier}×</strong></span>
                <span><small>Scratch signals</small><strong>{form.scratchAnalysisEnabled ? 'Enabled' : 'Off'}</strong></span>
              </div>
              <div className={styles.freeNote}><Sparkles aria-hidden="true" /><span><strong>SaturnPath V2 is completely free.</strong><small>No trial, subscription, or payment step follows this setup.</small></span></div>
            </div>
          )}

          <footer className={styles.actions}>
            <button className={styles.backButton} disabled={step === 0 || saving} onClick={() => setStep((current) => Math.max(0, current - 1))} type="button"><ChevronLeft aria-hidden="true" /> Back</button>
            {step < STEPS.length - 1 ? (
              <button className={styles.primaryButton} onClick={nextStep} type="button">Continue <span><ArrowRight aria-hidden="true" /></span></button>
            ) : (
              <button className={styles.primaryButton} disabled={saving} onClick={saveProfile} type="button">{saving ? 'Saving your path…' : 'Create my path'} <span>{saving ? <Sparkles aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</span></button>
            )}
          </footer>
        </form>
        <p className={styles.securityLine}><ShieldCheck aria-hidden="true" /> Your setup is saved to the same secure SaturnPath account used by web and mobile.</p>
      </section>
    </main>
  )
}
