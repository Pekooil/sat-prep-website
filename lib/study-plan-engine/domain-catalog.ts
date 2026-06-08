// ─────────────────────────────────────────────────────────────────────────────
// Domain Catalog
// Single source of truth for all 8 SAT domains:
//   • College Board official domain / skill labels (for QB filters)
//   • Question counts per Digital SAT section
//   • Points-per-question (section range 600 ÷ question pool)
//   • Skill progression ordered easy → medium → hard
// ─────────────────────────────────────────────────────────────────────────────

import type { DomainEntry, Difficulty, Subject } from './types'

// Math 44 questions → 600/44 ≈ 13.6 pts per question
// R&W  54 questions → 600/54 ≈ 11.1 pts per question
const M = 13.6
const R = 11.1

export const DOMAIN_CATALOG: DomainEntry[] = [
  // ─── Reading & Writing ────────────────────────────────────────────────
  {
    key: 'informationIdeas',
    label: 'Information and Ideas',
    cbDomain: 'Information and Ideas',
    subject: 'reading_writing',
    questionCount: 12,
    pointsPerQuestion: R,
    skills: [
      { label: 'Central ideas and details',          difficulty: 'easy'   },
      { label: 'Command of Evidence',                 difficulty: 'medium' },
      { label: 'Inferences',                         difficulty: 'hard'   },
    ],
  },
  {
    key: 'craftStructure',
    label: 'Craft and Structure',
    cbDomain: 'Craft and Structure',
    subject: 'reading_writing',
    questionCount: 18,
    pointsPerQuestion: R,
    skills: [
      { label: 'Words in context',           difficulty: 'easy'   },
      { label: 'Text structure and purpose', difficulty: 'medium' },
      { label: 'Cross-text connections',     difficulty: 'hard'   },
    ],
  },
  {
    key: 'expressionIdeas',
    label: 'Expression of Ideas',
    cbDomain: 'Expression of Ideas',
    subject: 'reading_writing',
    questionCount: 12,
    pointsPerQuestion: R,
    skills: [
      { label: 'Transitions',          difficulty: 'easy'   },
      { label: 'Rhetorical synthesis', difficulty: 'medium' },
    ],
  },
  {
    key: 'standardEnglish',
    label: 'Standard English Conventions',
    cbDomain: 'Standard English Conventions',
    subject: 'reading_writing',
    questionCount: 12,
    pointsPerQuestion: R,
    skills: [
      { label: 'Boundaries',               difficulty: 'easy'   },
      { label: 'Form, structure, and sense', difficulty: 'medium' },
    ],
  },
  // ─── Math ────────────────────────────────────────────────────────────
  {
    key: 'algebra',
    label: 'Algebra',
    cbDomain: 'Algebra',
    subject: 'math',
    questionCount: 13,
    pointsPerQuestion: M,
    skills: [
      { label: 'Linear equations in one variable',  difficulty: 'easy'   },
      { label: 'Linear equations in two variables', difficulty: 'easy'   },
      { label: 'Linear functions',                  difficulty: 'medium' },
      { label: 'Systems of linear equations',       difficulty: 'medium' },
      { label: 'Linear inequalities',               difficulty: 'hard'   },
    ],
  },
  {
    key: 'advancedMath',
    label: 'Advanced Math',
    cbDomain: 'Advanced Math',
    subject: 'math',
    questionCount: 13,
    pointsPerQuestion: M,
    skills: [
      { label: 'Equivalent expressions',               difficulty: 'easy'   },
      { label: 'Nonlinear equations in one variable',  difficulty: 'medium' },
      { label: 'Nonlinear functions',                  difficulty: 'hard'   },
    ],
  },
  {
    key: 'problemSolving',
    label: 'Problem-Solving and Data Analysis',
    cbDomain: 'Problem-Solving and Data Analysis',
    subject: 'math',
    questionCount: 9,
    pointsPerQuestion: M,
    skills: [
      { label: 'Ratios, rates, and proportional relationships',                difficulty: 'easy'   },
      { label: 'Percentages',                                                   difficulty: 'easy'   },
      { label: 'One-variable data: distributions and measures of center and spread', difficulty: 'medium' },
      { label: 'Two-variable data: models and scatterplots',                    difficulty: 'medium' },
      { label: 'Probability and conditional probability',                       difficulty: 'medium' },
      { label: 'Inference from sample statistics and margin of error',          difficulty: 'hard'   },
      { label: 'Evaluating statistical claims',                                 difficulty: 'hard'   },
    ],
  },
  {
    key: 'geometry',
    label: 'Geometry and Trigonometry',
    cbDomain: 'Geometry and Trigonometry',
    subject: 'math',
    questionCount: 6,
    pointsPerQuestion: M,
    skills: [
      { label: 'Area and volume',                  difficulty: 'easy'   },
      { label: 'Lines, angles, and triangles',     difficulty: 'easy'   },
      { label: 'Right triangles and trigonometry', difficulty: 'medium' },
      { label: 'Circles',                          difficulty: 'hard'   },
    ],
  },
]

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** O(1) domain lookup by key */
export const DOMAIN_BY_KEY = new Map<string, DomainEntry>(
  DOMAIN_CATALOG.map(d => [d.key, d])
)

/** Map constants.ts value strings → internal domain keys */
export const CONST_VALUE_TO_KEY: Record<string, string> = {
  algebra:           'algebra',
  advanced_math:     'advancedMath',
  problem_solving:   'problemSolving',
  geometry:          'geometry',
  information_ideas: 'informationIdeas',
  craft_structure:   'craftStructure',
  expression_ideas:  'expressionIdeas',
  standard_english:  'standardEnglish',
}

/** Return all skills at a given difficulty, falling back to the easiest available */
export function skillsAtDifficulty(domain: DomainEntry, diff: Difficulty) {
  const matching = domain.skills.filter(s => s.difficulty === diff)
  return matching.length > 0 ? matching : [domain.skills[0]]
}

/** Pick the primary skill for a domain at a given difficulty */
export function primarySkill(domain: DomainEntry, diff: Difficulty): string {
  return skillsAtDifficulty(domain, diff)[0].label
}

/**
 * Advance the skill pointer within a domain based on study progress.
 * skillIndex counts how many times this domain has been studied so far.
 * This creates natural progression through the skill list over time.
 */
export function skillAtIndex(domain: DomainEntry, skillIndex: number): string {
  return domain.skills[skillIndex % domain.skills.length].label
}
