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
  { label: 'Time Management', value: 'time' },
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
  { href: '/info', label: 'Info & Contact' },
] as const

export const SAT_SCORE_MIN = 400
export const SAT_SCORE_MAX = 1600
export const SAT_SECTION_MIN = 200
export const SAT_SECTION_MAX = 800

export const COLLEGE_BOARD_QB_URL = 'https://satsuite.collegeboard.org/digital/digital-practice-preparation/practice-tests/linear'
