import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatDate,
  formatShortDate,
  daysUntilTest,
  getScoreGap,
  getAccuracyPercent,
  subjectLabel,
  errorTypeLabel,
  testTypeLabel,
  todayISO,
} from '@/lib/utils'

// ─── cn ───────────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('removes conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('handles falsy values', () => {
    expect(cn('foo', false, undefined, null, 'bar')).toBe('foo bar')
  })

  it('handles conditional objects', () => {
    expect(cn({ 'text-red-500': true, 'text-green-500': false })).toBe('text-red-500')
  })
})

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats an ISO date string as "MMM d, yyyy"', () => {
    expect(formatDate('2025-01-15')).toBe('Jan 15, 2025')
  })

  it('formats a Date object', () => {
    // Use UTC noon to avoid timezone edge cases
    const d = new Date('2024-12-31T12:00:00Z')
    expect(formatDate(d)).toMatch(/Dec 31, 2024/)
  })
})

// ─── formatShortDate ─────────────────────────────────────────────────────────

describe('formatShortDate', () => {
  it('formats as "MMM d"', () => {
    expect(formatShortDate('2025-06-04')).toBe('Jun 4')
  })
})

// ─── daysUntilTest ────────────────────────────────────────────────────────────

describe('daysUntilTest', () => {
  beforeEach(() => {
    // Pin "today" to 2025-06-04
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-04T00:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns null when testDate is null', () => {
    expect(daysUntilTest(null)).toBeNull()
  })

  it('returns positive days for a future date', () => {
    expect(daysUntilTest('2025-06-14')).toBe(10)
  })

  it('returns 0 for today', () => {
    expect(daysUntilTest('2025-06-04')).toBe(0)
  })

  it('returns negative days for a past date', () => {
    // date-fns differenceInDays truncates toward zero; result is −9 or −10
    // depending on local timezone offset — just verify sign and magnitude
    const result = daysUntilTest('2025-05-25')
    expect(result).not.toBeNull()
    expect(result!).toBeLessThan(0)
    expect(Math.abs(result!)).toBeGreaterThanOrEqual(9)
    expect(Math.abs(result!)).toBeLessThanOrEqual(10)
  })
})

// ─── getScoreGap ─────────────────────────────────────────────────────────────

describe('getScoreGap', () => {
  it('returns the difference (target - current)', () => {
    expect(getScoreGap(1100, 1400)).toBe(300)
  })

  it('returns null when either value is null', () => {
    expect(getScoreGap(null, 1400)).toBeNull()
    expect(getScoreGap(1100, null)).toBeNull()
    expect(getScoreGap(null, null)).toBeNull()
  })

  it('returns negative gap when current > target', () => {
    expect(getScoreGap(1500, 1400)).toBe(-100)
  })
})

// ─── getAccuracyPercent ───────────────────────────────────────────────────────

describe('getAccuracyPercent', () => {
  it('returns 0 when attempted is 0', () => {
    expect(getAccuracyPercent(0, 0)).toBe(0)
  })

  it('returns 100 when all correct', () => {
    expect(getAccuracyPercent(10, 10)).toBe(100)
  })

  it('rounds to nearest integer', () => {
    expect(getAccuracyPercent(1, 3)).toBe(33)
    expect(getAccuracyPercent(2, 3)).toBe(67)
  })

  it('handles typical cases', () => {
    expect(getAccuracyPercent(75, 100)).toBe(75)
    expect(getAccuracyPercent(38, 44)).toBe(86)
  })
})

// ─── subjectLabel ─────────────────────────────────────────────────────────────

describe('subjectLabel', () => {
  it('returns readable labels', () => {
    expect(subjectLabel('math')).toBe('Math')
    expect(subjectLabel('reading_writing')).toBe('Reading & Writing')
    expect(subjectLabel('both')).toBe('Both')
  })

  it('returns raw value for unknown subject', () => {
    expect(subjectLabel('unknown')).toBe('unknown')
  })
})

// ─── errorTypeLabel ───────────────────────────────────────────────────────────

describe('errorTypeLabel', () => {
  const cases: [string, string][] = [
    ['concept',  'Concept Gap'],
    ['careless', 'Careless Error'],
    ['time',     'Timing Issue'],
    ['strategy', 'Strategy Error'],
    ['other',    'Other'],
  ]
  it.each(cases)('maps "%s" → "%s"', (input, expected) => {
    expect(errorTypeLabel(input)).toBe(expected)
  })
  it('returns raw value for unknown type', () => {
    expect(errorTypeLabel('weird')).toBe('weird')
  })
})

// ─── testTypeLabel ────────────────────────────────────────────────────────────

describe('testTypeLabel', () => {
  const cases: [string, string][] = [
    ['diagnostic',  'Diagnostic'],
    ['practice',    'Practice'],
    ['official',    'Official SAT'],
    ['full_length', 'Full Length'],
  ]
  it.each(cases)('maps "%s" → "%s"', (input, expected) => {
    expect(testTypeLabel(input)).toBe(expected)
  })
})

// ─── todayISO ─────────────────────────────────────────────────────────────────

describe('todayISO', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-04T08:30:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns today as YYYY-MM-DD', () => {
    expect(todayISO()).toBe('2025-06-04')
  })
})
