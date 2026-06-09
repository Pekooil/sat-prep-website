export interface CategoryColor {
  bg: string
  border: string
  text: string
  dot: string
  leftBar: string
}

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  'Algebra': {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    leftBar: 'border-l-blue-500',
  },
  'Advanced Math': {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-700 dark:text-indigo-300',
    dot: 'bg-indigo-500',
    leftBar: 'border-l-indigo-500',
  },
  'Problem-Solving and Data Analysis': {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
    leftBar: 'border-l-orange-500',
  },
  'Geometry and Trigonometry': {
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-200 dark:border-teal-800',
    text: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500',
    leftBar: 'border-l-teal-500',
  },
  'Information and Ideas': {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    dot: 'bg-green-500',
    leftBar: 'border-l-green-500',
  },
  'Craft and Structure': {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    leftBar: 'border-l-rose-500',
  },
  'Expression of Ideas': {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    leftBar: 'border-l-amber-500',
  },
  'Standard English Conventions': {
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    border: 'border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-700 dark:text-cyan-300',
    dot: 'bg-cyan-500',
    leftBar: 'border-l-cyan-500',
  },
  'Full Practice Test': {
    bg: 'bg-slate-50 dark:bg-slate-900/50',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-500',
    leftBar: 'border-l-slate-500',
  },
}

const DEFAULT_COLOR: CategoryColor = {
  bg: 'bg-gray-50 dark:bg-gray-900/50',
  border: 'border-gray-200 dark:border-gray-700',
  text: 'text-gray-700 dark:text-gray-300',
  dot: 'bg-gray-400',
  leftBar: 'border-l-gray-400',
}

export function getCategoryColor(category: string | null | undefined): CategoryColor {
  if (!category) return DEFAULT_COLOR
  return CATEGORY_COLORS[category] ?? DEFAULT_COLOR
}
