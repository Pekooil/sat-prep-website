import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateRecommendations, generateStudyPlan } from '@/lib/sat-planner'
import { rankDomains } from '@/lib/study-plan-engine/scoring.service'
import { buildSchedule } from '@/lib/study-plan-engine/scheduler.service'
import type { StudyBlock } from '@/lib/study-plan-engine/types'

const TODAY = new Date('2026-08-26T12:00:00Z')
const TEST_DATE = '2026-10-24'

describe('V1 study planner smoke coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(TODAY)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ranks all eight SAT domains and prioritizes a deliberate weak area', () => {
    const ranked = rankDomains(
      [
        {
          domainKey: 'algebra',
          attempted: 20,
          correct: 2,
          accuracy: 10,
        },
      ],
      1500,
    )

    expect(ranked).toHaveLength(8)
    expect(new Set(ranked.map((domain) => domain.entry.subject))).toEqual(
      new Set(['math', 'reading_writing']),
    )
    expect(ranked[0].entry.key).toBe('algebra')
  })

  it('keeps both subjects in a normal study day and preserves test milestones', () => {
    const input = {
      userId: '00000000-0000-0000-0000-000000000001',
      currentScore: 1100,
      targetScore: 1400,
      testDate: TEST_DATE,
      dailyStudyMinutes: 60,
      topicPerformance: [],
    }
    const ranked = rankDomains([], input.targetScore)
    const { schedule, practiceTestCount } = buildSchedule(input, ranked)
    const studyDay = schedule.find((day) => day.dayType === 'study')
    const studyBlocks = (studyDay?.blocks ?? []) as StudyBlock[]

    expect(studyDay).toBeDefined()
    expect(new Set(studyBlocks.map((block) => block.subject))).toEqual(
      new Set(['math', 'reading_writing']),
    )
    expect(studyDay?.totalDurationMinutes).toBe(60)
    expect(practiceTestCount).toBeGreaterThan(0)
    expect(schedule).toContainEqual(
      expect.objectContaining({ date: TEST_DATE, dayType: 'test_day' }),
    )
    expect(schedule).toContainEqual(
      expect.objectContaining({ date: '2026-10-22', dayType: 'practice_test' }),
    )
  })

  it('retains the V1 onboarding recommendation contract', () => {
    const recommendations = generateRecommendations({
      currentScore: 1100,
      targetScore: 1400,
      testDate: TEST_DATE,
      dailyStudyMinutes: 60,
      accuracyByDomainKey: new Map([['geometry', 30]]),
    })

    expect(recommendations.message).toBeTruthy()
    expect(recommendations.priorityTopics).toHaveLength(4)
    expect(recommendations.studyTips.length).toBeGreaterThan(0)
    expect(recommendations.estimatedTimelineWeeks).toBeGreaterThan(0)
    expect(recommendations.priorityTopics[0].cbFilters).toEqual(
      expect.objectContaining({ domain: expect.any(String), difficulty: expect.any(String) }),
    )
  })

  it('retains the V1 generated study-plan contract', () => {
    const plan = generateStudyPlan({
      currentScore: 1100,
      targetScore: 1400,
      testDate: TEST_DATE,
      hoursPerWeek: 7,
      weakAreaKeys: ['algebra', 'standard_english'],
    })

    expect(plan.title).toContain('Target 1400')
    expect(plan.totalWeeks).toBeGreaterThan(0)
    expect(plan.weeks).toHaveLength(plan.totalWeeks)
    expect(plan.overallStrategy).toContain('questions/day')
    expect(plan.weeks[0]).toEqual(
      expect.objectContaining({
        weekNumber: 1,
        startDate: expect.any(String),
        endDate: expect.any(String),
        tasks: expect.any(Array),
      }),
    )
  })
})
