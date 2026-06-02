import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d')
}

export function daysUntilTest(testDate: string | null): number | null {
  if (!testDate) return null
  return differenceInDays(parseISO(testDate), new Date())
}

export function getScoreGap(current: number | null, target: number | null): number | null {
  if (!current || !target) return null
  return target - current
}

export function getAccuracyPercent(correct: number, attempted: number): number {
  if (attempted === 0) return 0
  return Math.round((correct / attempted) * 100)
}

export function subjectLabel(subject: string): string {
  switch (subject) {
    case 'math': return 'Math'
    case 'reading_writing': return 'Reading & Writing'
    case 'both': return 'Both'
    default: return subject
  }
}

export function errorTypeLabel(type: string): string {
  switch (type) {
    case 'concept': return 'Concept Gap'
    case 'careless': return 'Careless Error'
    case 'time': return 'Time Management'
    case 'strategy': return 'Strategy Error'
    case 'other': return 'Other'
    default: return type
  }
}

export function testTypeLabel(type: string): string {
  switch (type) {
    case 'diagnostic': return 'Diagnostic'
    case 'practice': return 'Practice'
    case 'official': return 'Official SAT'
    case 'full_length': return 'Full Length'
    default: return type
  }
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
