import { describe, expect, it } from 'vitest'
import { generateStudyPlanPreview, validateStudyPlanInput } from '@/lib/marketing/study-plan-preview'

const now = new Date('2026-09-07T12:00:00')

describe('study plan preview', () => {
  it('builds a steady five-session plan for a medium score gap', () => {
    const plan = generateStudyPlanPreview({
      currentScore: 1100,
      targetScore: 1350,
      testDate: '2026-11-02',
      sessionMinutes: 30,
      focusArea: 'math',
    }, now)

    expect(plan.daysRemaining).toBe(56)
    expect(plan.weeksRemaining).toBe(8)
    expect(plan.sessionsPerWeek).toBe(5)
    expect(plan.weeklyMinutes).toBe(150)
    expect(plan.focusLabel).toBe('Math')
    expect(plan.rhythm).toHaveLength(6)
  })

  it('uses a six-session sprint when the test is close', () => {
    const plan = generateStudyPlanPreview({
      currentScore: 1250,
      targetScore: 1400,
      testDate: '2026-09-20',
      sessionMinutes: 20,
      focusArea: 'reading-writing',
    }, now)

    expect(plan.paceLabel).toBe('Focused sprint')
    expect(plan.sessionsPerWeek).toBe(6)
    expect(plan.phases).toHaveLength(3)
  })

  it('rejects impossible scores and past dates', () => {
    expect(validateStudyPlanInput({
      currentScore: 1500,
      targetScore: 1400,
      testDate: '2026-10-01',
      sessionMinutes: 30,
      focusArea: 'balanced',
    }, now)).toContain('higher')

    expect(validateStudyPlanInput({
      currentScore: 1100,
      targetScore: 1400,
      testDate: '2026-09-01',
      sessionMinutes: 30,
      focusArea: 'balanced',
    }, now)).toContain('future')
  })
})
