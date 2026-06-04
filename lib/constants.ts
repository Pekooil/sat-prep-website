export const MATH_DOMAINS = [
  {
    label: 'Algebra',
    value: 'algebra',
    skills: [
      'Linear equations in one variable',
      'Linear equations in two variables',
      'Linear functions',
      'Systems of linear equations',
      'Linear inequalities',
    ],
  },
  {
    label: 'Advanced Math',
    value: 'advanced_math',
    skills: [
      'Equivalent expressions',
      'Nonlinear equations in one variable',
      'Systems of equations',
      'Nonlinear functions',
    ],
  },
  {
    label: 'Problem-Solving & Data Analysis',
    value: 'problem_solving',
    skills: [
      'Ratios, rates, proportional relationships',
      'Percentages',
      'One-variable data: distributions and measures',
      'Two-variable data: models and scatterplots',
      'Probability and conditional probability',
      'Inference from sample statistics',
      'Evaluating statistical claims',
    ],
  },
  {
    label: 'Geometry & Trigonometry',
    value: 'geometry',
    skills: [
      'Area and volume',
      'Lines, angles, and triangles',
      'Right triangles and trigonometry',
      'Circles',
    ],
  },
]

export const RW_DOMAINS = [
  {
    label: 'Information and Ideas',
    value: 'information_ideas',
    skills: [
      'Central ideas and details',
      'Command of evidence (textual)',
      'Command of evidence (quantitative)',
      'Inferences',
    ],
  },
  {
    label: 'Craft and Structure',
    value: 'craft_structure',
    skills: [
      'Words in context',
      'Text structure and purpose',
      'Cross-text connections',
    ],
  },
  {
    label: 'Expression of Ideas',
    value: 'expression_ideas',
    skills: [
      'Rhetorical synthesis',
      'Transitions',
    ],
  },
  {
    label: 'Standard English Conventions',
    value: 'standard_english',
    skills: [
      'Boundaries',
      'Form, structure, and sense',
    ],
  },
]

export const ERROR_TYPES = [
  { label: 'Concept Gap', value: 'concept' },
  { label: 'Careless Error', value: 'careless' },
  { label: 'Timing Issue', value: 'time' },
  { label: 'Strategy Error', value: 'strategy' },
  { label: 'Other', value: 'other' },
] as const

export const TEST_TYPES = [
  { label: 'Diagnostic', value: 'diagnostic' },
  { label: 'Practice Test', value: 'practice' },
  { label: 'Official SAT', value: 'official' },
  { label: 'Full Length', value: 'full_length' },
] as const

export const NAV_LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/error-log', label: 'Error Log' },
  { href: '/data', label: 'Data' },
  { href: '/tutorial', label: 'QB Tutorial' },
  { href: '/info', label: 'Info & Contact' },
] as const

export const SAT_SCORE_MIN = 400
export const SAT_SCORE_MAX = 1600
export const SAT_SECTION_MIN = 200
export const SAT_SECTION_MAX = 800

export const COLLEGE_BOARD_QB_URL = 'https://satsuiteeducatorquestionbank.collegeboard.org/digital/search'

// ─── Timezones ────────────────────────────────────────────────────────────────

export const TIMEZONES = [
  // North America
  { label: 'Eastern Time (US & Canada)',  value: 'America/New_York' },
  { label: 'Central Time (US & Canada)',  value: 'America/Chicago' },
  { label: 'Mountain Time (US & Canada)', value: 'America/Denver' },
  { label: 'Pacific Time (US & Canada)',  value: 'America/Los_Angeles' },
  { label: 'Alaska',                      value: 'America/Anchorage' },
  { label: 'Hawaii',                      value: 'Pacific/Honolulu' },
  { label: 'Toronto / Eastern Canada',    value: 'America/Toronto' },
  { label: 'Vancouver',                   value: 'America/Vancouver' },
  { label: 'Atlantic Time (Canada)',      value: 'America/Halifax' },
  { label: 'Mexico City',                 value: 'America/Mexico_City' },
  // South America
  { label: 'São Paulo / Brasília',        value: 'America/Sao_Paulo' },
  { label: 'Buenos Aires',               value: 'America/Argentina/Buenos_Aires' },
  { label: 'Bogotá / Lima',              value: 'America/Bogota' },
  // UTC
  { label: 'UTC',                         value: 'UTC' },
  // Europe
  { label: 'London',                      value: 'Europe/London' },
  { label: 'Paris / Berlin / Rome',       value: 'Europe/Paris' },
  { label: 'Helsinki / Kyiv / Athens',    value: 'Europe/Helsinki' },
  { label: 'Moscow',                      value: 'Europe/Moscow' },
  // Africa
  { label: 'Cairo',                       value: 'Africa/Cairo' },
  { label: 'Nairobi',                     value: 'Africa/Nairobi' },
  { label: 'Johannesburg',               value: 'Africa/Johannesburg' },
  // Middle East
  { label: 'Dubai / Abu Dhabi',           value: 'Asia/Dubai' },
  { label: 'Riyadh',                      value: 'Asia/Riyadh' },
  { label: 'Tehran',                      value: 'Asia/Tehran' },
  // Asia
  { label: 'Mumbai / Kolkata',            value: 'Asia/Kolkata' },
  { label: 'Dhaka',                       value: 'Asia/Dhaka' },
  { label: 'Bangkok',                     value: 'Asia/Bangkok' },
  { label: 'Singapore / Kuala Lumpur',    value: 'Asia/Singapore' },
  { label: 'Hong Kong',                   value: 'Asia/Hong_Kong' },
  { label: 'Taipei',                      value: 'Asia/Taipei' },
  { label: 'Beijing / Shanghai',          value: 'Asia/Shanghai' },
  { label: 'Seoul',                       value: 'Asia/Seoul' },
  { label: 'Tokyo',                       value: 'Asia/Tokyo' },
  // Oceania
  { label: 'Sydney / Melbourne',          value: 'Australia/Sydney' },
  { label: 'Brisbane',                    value: 'Australia/Brisbane' },
  { label: 'Perth',                       value: 'Australia/Perth' },
  { label: 'Auckland',                    value: 'Pacific/Auckland' },
] as const

export type Timezone = (typeof TIMEZONES)[number]['value']
