export type FocusArea = 'math' | 'reading-writing' | 'balanced' | 'not-sure'

export interface StudyPlanInput {
  currentScore: number
  targetScore: number
  testDate: string
  sessionMinutes: number
  focusArea: FocusArea
}

export interface StudyPlanPreview {
  daysRemaining: number
  weeksRemaining: number
  sessionsPerWeek: number
  weeklyMinutes: number
  focusLabel: string
  paceLabel: string
  phases: Array<{ label: string; timing: string; description: string }>
  rhythm: Array<{ day: string; task: string }>
}

const FOCUS_LABELS: Record<FocusArea, string> = {
  math: 'Math',
  'reading-writing': 'Reading and Writing',
  balanced: 'Balanced Math and Reading/Writing',
  'not-sure': 'Diagnostic-led',
}

function dateInputToUtc(dateInput: string): number {
  const [year, month, day] = dateInput.split('-').map(Number)
  if (!year || !month || !day) return Number.NaN
  return Date.UTC(year, month - 1, day)
}

function localDateToUtc(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

export function validateStudyPlanInput(input: StudyPlanInput, now = new Date()): string | null {
  if (!Number.isFinite(input.currentScore) || input.currentScore < 400 || input.currentScore > 1600) {
    return 'Enter a current score between 400 and 1600.'
  }
  if (!Number.isFinite(input.targetScore) || input.targetScore < 400 || input.targetScore > 1600) {
    return 'Enter a target score between 400 and 1600.'
  }
  if (input.targetScore <= input.currentScore) return 'Your target score must be higher than your current score.'
  if (!input.testDate) return 'Choose your SAT test date.'

  const testDate = dateInputToUtc(input.testDate)
  const today = localDateToUtc(now)
  if (Number.isNaN(testDate) || testDate <= today) return 'Choose a future SAT test date.'
  if (![20, 30, 45, 60].includes(input.sessionMinutes)) return 'Choose a session length.'
  return null
}

export function generateStudyPlanPreview(input: StudyPlanInput, now = new Date()): StudyPlanPreview {
  const error = validateStudyPlanInput(input, now)
  if (error) throw new Error(error)

  const testDate = dateInputToUtc(input.testDate)
  const today = localDateToUtc(now)
  const daysRemaining = Math.max(1, Math.round((testDate - today) / 86_400_000))
  const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7))
  const scoreGap = input.targetScore - input.currentScore
  const sessionsPerWeek = daysRemaining < 21 || scoreGap > 250 ? 6 : scoreGap > 120 ? 5 : 4
  const focusLabel = FOCUS_LABELS[input.focusArea]
  const priority = input.focusArea === 'math'
    ? 'Math skill work'
    : input.focusArea === 'reading-writing'
      ? 'Reading and Writing skill work'
      : input.focusArea === 'not-sure'
        ? 'diagnostic review'
        : 'alternating Math and Reading/Writing'

  const paceLabel = daysRemaining < 21
    ? 'Focused sprint'
    : daysRemaining < 50
      ? 'Steady build'
      : 'Foundation and growth'

  const phases = daysRemaining < 21
    ? [
        { label: 'Find the leaks', timing: 'Days 1–2', description: `Use one official timed checkpoint to identify the two skills costing you the most points.` },
        { label: 'Target and review', timing: `Middle ${Math.max(4, daysRemaining - 5)} days`, description: `Alternate ${priority} with short mixed sets. Log why every miss happened before moving on.` },
        { label: 'Rehearse calmly', timing: 'Final 3 days', description: 'Complete one realistic dress rehearsal, review lightly, and protect sleep before test day.' },
      ]
    : [
        { label: 'Baseline', timing: 'First 15%', description: 'Complete an official checkpoint, identify weak skills, and set a repeatable weekly rhythm.' },
        { label: 'Targeted growth', timing: 'Middle 60%', description: `Give the largest share of practice to ${priority}, with immediate mistake review and spaced follow-up.` },
        { label: 'Mixed performance', timing: 'Next 15%', description: 'Blend skills under realistic timing so accuracy transfers beyond isolated drills.' },
        { label: 'Test readiness', timing: 'Final 10%', description: 'Use an official full-length practice test, close the last recurring gaps, and taper before test day.' },
      ]

  const alternateFocus = input.focusArea === 'math'
    ? 'Reading and Writing maintenance'
    : input.focusArea === 'reading-writing'
      ? 'Math maintenance'
      : 'Second-section skill work'

  const rhythm = [
    { day: 'Session 1', task: `${focusLabel} skill practice · ${input.sessionMinutes} min` },
    { day: 'Session 2', task: `Mistake review and targeted retry · ${input.sessionMinutes} min` },
    { day: 'Session 3', task: `${alternateFocus} · ${input.sessionMinutes} min` },
    { day: 'Session 4', task: `Timed mixed set and error log · ${input.sessionMinutes} min` },
    ...(sessionsPerWeek >= 5 ? [{ day: 'Session 5', task: `Weakest-skill follow-up · ${input.sessionMinutes} min` }] : []),
    ...(sessionsPerWeek >= 6 ? [{ day: 'Session 6', task: `Short checkpoint or full-test rotation · ${input.sessionMinutes} min` }] : []),
    { day: 'Rest day', task: 'No assigned questions. Let review spacing do its job.' },
  ]

  return {
    daysRemaining,
    weeksRemaining,
    sessionsPerWeek,
    weeklyMinutes: sessionsPerWeek * input.sessionMinutes,
    focusLabel,
    paceLabel,
    phases,
    rhythm,
  }
}
