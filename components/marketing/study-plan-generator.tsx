'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Printer, Share2, Target } from 'lucide-react'
import { track } from '@vercel/analytics/react'
import {
  generateStudyPlanPreview,
  validateStudyPlanInput,
  type FocusArea,
  type StudyPlanInput,
  type StudyPlanPreview,
} from '@/lib/marketing/study-plan-preview'
import styles from './study-plan-generator.module.css'

const DEFAULT_INPUT: StudyPlanInput = {
  currentScore: 1100,
  targetScore: 1350,
  testDate: '',
  sessionMinutes: 30,
  focusArea: 'not-sure',
}

export function StudyPlanGenerator() {
  const [input, setInput] = React.useState<StudyPlanInput>(DEFAULT_INPUT)
  const [plan, setPlan] = React.useState<StudyPlanPreview | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [shareStatus, setShareStatus] = React.useState<string | null>(null)

  function update<K extends keyof StudyPlanInput>(field: K, value: StudyPlanInput[K]) {
    setInput((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateStudyPlanInput(input)
    if (validationError) {
      setError(validationError)
      setPlan(null)
      return
    }

    const nextPlan = generateStudyPlanPreview(input)
    setError(null)
    setPlan(nextPlan)
    track('Study Plan Generated')
    window.requestAnimationFrame(() => document.getElementById('study-plan-result')?.focus())
  }

  async function handleShare() {
    const shareData = {
      title: 'Free SAT Study Plan Generator — SaturnPath',
      text: 'Build a free personalized SAT study plan from your score, test date, and available time.',
      url: `${window.location.origin}/tools/sat-study-plan`,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setShareStatus('Planner shared')
      } else {
        await navigator.clipboard.writeText(shareData.url)
        setShareStatus('Planner link copied')
      }
      track('Study Plan Shared')
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return
      setShareStatus('Copy the page address to share this planner')
    }
  }

  function handlePrint() {
    track('Study Plan Printed')
    window.print()
  }

  return (
    <div className={styles.generator}>
      <form onSubmit={handleSubmit} className={styles.form} aria-describedby="planner-privacy-note">
        <div className={styles.formHeading}>
          <span>Free plan preview</span>
          <h2>Build your starting schedule</h2>
          <p>No account is needed to see it. SaturnPath does not save this preview to a student profile.</p>
        </div>

        <div className={styles.fieldGrid}>
          <label>
            <span>Current SAT score</span>
            <input type="number" min="400" max="1600" step="10" value={input.currentScore} onChange={(event) => update('currentScore', Number(event.target.value))} />
          </label>
          <label>
            <span>Target SAT score</span>
            <input type="number" min="400" max="1600" step="10" value={input.targetScore} onChange={(event) => update('targetScore', Number(event.target.value))} />
          </label>
          <label>
            <span>Test date</span>
            <input type="date" value={input.testDate} onChange={(event) => update('testDate', event.target.value)} />
          </label>
          <label>
            <span>Time per study session</span>
            <select value={input.sessionMinutes} onChange={(event) => update('sessionMinutes', Number(event.target.value))}>
              <option value="20">20 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </label>
          <label className={styles.fullField}>
            <span>Where do you need the most help?</span>
            <select value={input.focusArea} onChange={(event) => update('focusArea', event.target.value as FocusArea)}>
              <option value="not-sure">Not sure yet</option>
              <option value="math">Math</option>
              <option value="reading-writing">Reading and Writing</option>
              <option value="balanced">Both sections</option>
            </select>
          </label>
        </div>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button type="submit">Preview my study plan <ArrowRight /></button>
        <small id="planner-privacy-note">This preview is planning guidance, not a promise of a particular score increase.</small>
      </form>

      {plan ? (
        <section id="study-plan-result" className={styles.result} tabIndex={-1} aria-live="polite">
          <div className={styles.resultHeading}>
            <span><CheckCircle2 /> Your starting plan</span>
            <h2>{plan.paceLabel}: {plan.weeksRemaining} {plan.weeksRemaining === 1 ? 'week' : 'weeks'} to test day</h2>
            <p>Use this as your first rhythm, then adjust it using the mistakes and timing patterns you actually see.</p>
          </div>

          <div className={styles.metrics}>
            <article><CalendarDays /><span><small>Time remaining</small><strong>{plan.daysRemaining} days</strong></span></article>
            <article><Clock3 /><span><small>Weekly rhythm</small><strong>{plan.sessionsPerWeek} sessions</strong></span></article>
            <article><Target /><span><small>Starting focus</small><strong>{plan.focusLabel}</strong></span></article>
          </div>

          <div className={styles.resultSection}>
            <h3>Your phases</h3>
            <div className={styles.phases}>{plan.phases.map((phase) => <article key={phase.label}><span>{phase.timing}</span><strong>{phase.label}</strong><p>{phase.description}</p></article>)}</div>
          </div>

          <div className={styles.resultSection}>
            <h3>A repeatable week</h3>
            <p>About {plan.weeklyMinutes} focused minutes per week.</p>
            <div className={styles.rhythm}>{plan.rhythm.map((item) => <div key={item.day}><strong>{item.day}</strong><span>{item.task}</span></div>)}</div>
          </div>

          <div className={styles.planActions} aria-label="Study plan actions">
            <button type="button" onClick={handlePrint}><Printer /> Print my plan</button>
            <button type="button" onClick={handleShare}><Share2 /> Share the free planner</button>
            <span role="status" aria-live="polite">{shareStatus}</span>
          </div>

          <aside className={styles.saveCta}>
            <div><span>Make it adaptive</span><h3>Put this plan on a calendar that changes with your results.</h3><p>Create a free SaturnPath account to track sessions, review mistakes, and update what comes next.</p></div>
            <Link
              href="/signup?next=%2Fonboarding&utm_source=study_plan_tool&utm_medium=organic_tool&utm_campaign=save_plan"
              onClick={() => track('Study Plan Signup Clicked', { placement: 'result' })}
            >
              Save my plan free <ArrowRight />
            </Link>
          </aside>
        </section>
      ) : null}
    </div>
  )
}
