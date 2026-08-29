import quota from '@/content/v2/question-bank-quota.v1.json'
import { describe, expect, it } from 'vitest'

type Totals = Record<'easy' | 'medium' | 'hard', number>
type ResponseTotals = Record<'mcq' | 'spr', number>

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

describe('V2 question-bank quota contract', () => {
  it('contains exactly 100 questions per section and 200 overall', () => {
    expect(quota.sections).toHaveLength(2)
    expect(quota.sections.map((section) => section.quota)).toEqual([100, 100])
    expect(sum(quota.sections.map((section) => section.quota))).toBe(200)
    expect(quota.targets).toEqual({ total: 200, readingWriting: 100, math: 100 })
  })

  it('makes every domain quota equal its official rounded weight', () => {
    for (const section of quota.sections) {
      expect(sum(section.domains.map((domain) => domain.quota))).toBe(section.quota)
      expect(sum(section.domains.map((domain) => domain.officialWeightPercent))).toBe(100)

      for (const domain of section.domains) {
        expect(sum(domain.subskills.map((subskill) => subskill.quota))).toBe(domain.quota)
        expect(domain.quota).toBe(domain.officialWeightPercent)
      }
    }
  })

  it('keeps all taxonomy identifiers unique', () => {
    const domainIds = quota.sections.flatMap((section) =>
      section.domains.map((domain) => `${section.id}:${domain.id}`),
    )
    const subskillIds = quota.sections.flatMap((section) =>
      section.domains.flatMap((domain) =>
        domain.subskills.map((subskill) => `${section.id}:${subskill.id}`),
      ),
    )

    expect(new Set(domainIds).size).toBe(domainIds.length)
    expect(new Set(subskillIds).size).toBe(subskillIds.length)
  })

  it('balances every subskill across its declared difficulty and response types', () => {
    for (const section of quota.sections) {
      const difficulty: Totals = { easy: 0, medium: 0, hard: 0 }
      const responseTypes: ResponseTotals = { mcq: 0, spr: 0 }

      for (const domain of section.domains) {
        for (const subskill of domain.subskills) {
          expect(sum(Object.values(subskill.difficulty))).toBe(subskill.quota)
          expect(sum(Object.values(subskill.responseTypes))).toBe(subskill.quota)

          difficulty.easy += subskill.difficulty.easy
          difficulty.medium += subskill.difficulty.medium
          difficulty.hard += subskill.difficulty.hard
          responseTypes.mcq += subskill.responseTypes.mcq
          responseTypes.spr += subskill.responseTypes.spr
        }
      }

      expect(difficulty).toEqual(section.difficulty)
      expect(responseTypes).toEqual(section.responseTypes)
    }
  })

  it('matches the official Math format and context targets adopted for the bank', () => {
    const math = quota.sections.find((section) => section.id === 'math')
    expect(math).toBeDefined()
    expect(math?.responseTypes).toEqual({ mcq: 75, spr: 25 })

    if (!math || !('contextualQuestionQuota' in math)) return

    const contextualTotal = sum(
      math.domains.flatMap((domain) =>
        domain.subskills.map((subskill) =>
          'contextualQuestionQuota' in subskill
            ? subskill.contextualQuestionQuota
            : 0,
        ),
      ),
    )

    expect(contextualTotal).toBe(math.contextualQuestionQuota)
    expect(contextualTotal).toBe(30)
  })
})
