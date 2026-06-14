'use client'

import * as React from 'react'
import { Plus, Search, SlidersHorizontal, X, Archive, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useErrorLogs } from '@/hooks/use-error-logs'
import { AddErrorDialog } from './add-error-dialog'
import { ErrorRow } from './error-row'
import { MistakeTypeBadge } from './mistake-type-badge'
import type { MistakeTypeKey } from './mistake-type-badge'
import { MATH_DOMAINS, RW_DOMAINS, ERROR_TYPES } from '@/lib/constants'
import { getCategoryColor } from '@/components/calendar/task-colors'
import type { ErrorLog } from '@/types'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'newest' | 'oldest' | 'category' | 'type' | 'confidence_asc' | 'confidence_desc'

const ALL_DOMAINS = [
  ...MATH_DOMAINS.map(d => ({ ...d, subject: 'math' as const })),
  ...RW_DOMAINS.map(d => ({ ...d, subject: 'reading_writing' as const })),
]

const MISTAKE_BAR_COLOR: Record<MistakeTypeKey, string> = {
  concept:  'bg-red-500',
  careless: 'bg-amber-500',
  time:     'bg-blue-500',
  strategy: 'bg-orange-500',
  other:    'bg-green-500',
}

// Hex values that match task-colors.ts Tailwind classes
const DOMAIN_HEX: Record<string, string> = {
  'Algebra':                              '#3b82f6',
  'Advanced Math':                        '#6366f1',
  'Problem-Solving and Data Analysis':    '#f97316',
  'Geometry and Trigonometry':            '#14b8a6',
  'Information and Ideas':                '#22c55e',
  'Craft and Structure':                  '#f43f5e',
  'Expression of Ideas':                  '#f59e0b',
  'Standard English Conventions':         '#06b6d4',
}

const DOMAIN_ABBR: Record<string, string> = {
  'Problem-Solving and Data Analysis': 'PSDA',
  'Geometry and Trigonometry':         'Geo & Trig',
  'Standard English Conventions':      'Std English',
  'Expression of Ideas':               'Expression',
  'Information and Ideas':             'Info & Ideas',
  'Craft and Structure':               'Craft',
  'Advanced Math':                     'Adv Math',
  'Algebra':                           'Algebra',
}

const SUBJECT_HEX: Record<string, string> = {
  math:            '#3b82f6',
  reading_writing: '#7c3aed',
}

const SUBJECT_LABEL: Record<string, string> = {
  math:            'Math',
  reading_writing: 'Reading & Writing',
}

const TYPE_HEX: Record<string, string> = {
  concept:  '#ef4444',
  careless: '#f59e0b',
  time:     '#3b82f6',
  strategy: '#f97316',
  other:    '#22c55e',
}

const TYPE_LABEL: Record<string, string> = {
  concept:  'Concept Gap',
  careless: 'Careless',
  time:     'Timing Issue',
  strategy: 'Strategy',
  other:    'Other',
}

const TIP_STYLE = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
  padding: '8px 12px',
  color: 'var(--foreground)',
}

// ─── Mistakes Pie Chart (toggleable: domain / subject / type) ─────────────────

type PieMode = 'domain' | 'subject' | 'type'

const PIE_MODE_TITLE: Record<PieMode, string> = {
  domain:  'Mistakes by Domain',
  subject: 'Mistakes by Subject',
  type:    'Mistakes by Type',
}

function DomainPieChart({ errors }: { errors: ErrorLog[] }) {
  const [mode, setMode] = React.useState<PieMode>('domain')

  const { data, total } = React.useMemo(() => {
    const active = errors.filter(e => !e.archived)
    const counts = new Map<string, number>()

    if (mode === 'domain') {
      for (const e of active) counts.set(e.category, (counts.get(e.category) ?? 0) + 1)
    } else if (mode === 'subject') {
      for (const e of active) counts.set(e.subject, (counts.get(e.subject) ?? 0) + 1)
    } else {
      for (const e of active) counts.set(e.error_type, (counts.get(e.error_type) ?? 0) + 1)
    }

    const rows = [...counts.entries()]
      .map(([name, value]) => {
        if (mode === 'domain')  return { name, label: DOMAIN_ABBR[name]  ?? name, value, color: DOMAIN_HEX[name]   ?? '#6b7280' }
        if (mode === 'subject') return { name, label: SUBJECT_LABEL[name] ?? name, value, color: SUBJECT_HEX[name] ?? '#6b7280' }
        return                         { name, label: TYPE_LABEL[name]    ?? name, value, color: TYPE_HEX[name]    ?? '#6b7280' }
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)

    return { data: rows, total: rows.reduce((s, d) => s + d.value, 0) }
  }, [mode, errors])

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{PIE_MODE_TITLE[mode]}</CardTitle>
            {total > 0 && (
              <p className="text-xs text-[var(--muted-foreground)]">{total} active errors</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {(['domain', 'subject', 'type'] as PieMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded border transition-colors',
                  mode === m
                    ? 'bg-[var(--accent)] text-white border-transparent'
                    : 'text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'
                )}
              >
                {m === 'domain' ? 'Domain' : m === 'subject' ? 'Subject' : 'Type'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[180px]">
            <p className="text-sm text-[var(--muted-foreground)]">No data yet</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={68}
                  innerRadius={32}
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TIP_STYLE}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(val: any, name: any) => [
                    `${val} (${Math.round((Number(val) / total) * 100)}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
              {data.map(d => (
                <div key={d.name} className="flex items-center gap-1 text-[10px]">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[var(--muted-foreground)]">{d.label}</span>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Mistake Trend Line Chart ─────────────────────────────────────────────────

function MistakeTrendChart({ errors }: { errors: ErrorLog[] }) {
  const active = errors.filter(e => !e.archived)

  const dateCounts = new Map<string, number>()
  for (const e of active) {
    const date = e.created_at.slice(0, 10)
    dateCounts.set(date, (dateCounts.get(date) ?? 0) + 1)
  }

  const data = [...dateCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    }))

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">Mistake Trend</CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">Errors logged per day</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-sm text-[var(--muted-foreground)]">No data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={TIP_STYLE}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any) => [val, 'Errors']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ fill: '#7c3aed', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Most Frequent Mistakes Summary ──────────────────────────────────────────

function FrequencySummary({ errors }: { errors: ErrorLog[] }) {
  const active = errors.filter(e => !e.archived)
  if (active.length === 0) return null

  const unmastered = active.filter(e => !e.mastered)

  // Mistake type breakdown
  const typeCounts = ERROR_TYPES.map(t => ({
    value: t.value as MistakeTypeKey,
    label: t.label,
    total: active.filter(e => e.error_type === t.value).length,
    unmastered: unmastered.filter(e => e.error_type === t.value).length,
  })).filter(t => t.total > 0).sort((a, b) => b.total - a.total)

  const maxCount = typeCounts[0]?.total ?? 1

  // Top categories by unmastered error count
  const catCounts = new Map<string, number>()
  for (const e of unmastered) {
    catCounts.set(e.category, (catCounts.get(e.category) ?? 0) + 1)
  }
  const topCategories = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const masteryPct = active.length > 0 ? Math.round((active.filter(e => e.mastered).length / active.length) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">Most Frequent Mistakes</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Type breakdown bars */}
        <div className="space-y-2">
          {typeCounts.map(t => (
            <div key={t.value} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <MistakeTypeBadge type={t.value} size="sm" />
                <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                  {t.total - t.unmastered}/{t.total} reviewed
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', MISTAKE_BAR_COLOR[t.value])}
                  style={{ width: `${(t.total / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row: top weak areas + mastery % */}
        <div className="flex items-start justify-between gap-4 border-t border-[var(--border)] pt-3">
          {topCategories.length > 0 && (
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                Weakest areas
              </p>
              <div className="flex flex-wrap gap-1">
                {topCategories.map(([cat, count]) => {
                  const cc = getCategoryColor(cat)
                  return (
                    <span
                      key={cat}
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px] rounded border px-1.5 py-0.5',
                        cc.bg, cc.border, cc.text,
                      )}
                    >
                      {cat}
                      <span className="font-bold">{count}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          <div className="text-right shrink-0">
            <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Mastery</p>
            <p className={cn(
              'text-lg font-bold',
              masteryPct >= 70 ? 'text-emerald-600 dark:text-emerald-400'
              : masteryPct >= 40 ? 'text-amber-500'
              : 'text-red-500'
            )}>
              {masteryPct}%
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              {active.filter(e => e.mastered).length}/{active.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Filter + sort helpers ────────────────────────────────────────────────────

function applyFiltersAndSort(
  errors: ErrorLog[],
  {
    search,
    subject,
    category,
    errorType,
    mastered,
    sortBy,
    tab,
  }: {
    search: string
    subject: string
    category: string
    errorType: string
    mastered: string
    sortBy: SortKey
    tab: 'active' | 'archived'
  },
): ErrorLog[] {
  let list = errors.filter(e => (tab === 'archived' ? e.archived === true : e.archived !== true))

  if (subject !== 'all') list = list.filter(e => e.subject === subject)
  if (category !== 'all') list = list.filter(e => e.category === category)
  if (errorType !== 'all') list = list.filter(e => e.error_type === errorType)
  if (mastered === 'mastered') list = list.filter(e => e.mastered)
  if (mastered === 'unmastered') list = list.filter(e => !e.mastered)

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(e =>
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.subcategory?.toLowerCase().includes(q) ?? false) ||
      (e.correct_approach?.toLowerCase().includes(q) ?? false) ||
      (e.corrected_explanation?.toLowerCase().includes(q) ?? false)
    )
  }

  list = [...list].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'category':        return a.category.localeCompare(b.category)
      case 'type':            return a.error_type.localeCompare(b.error_type)
      case 'confidence_asc':  return (a.confidence_rating ?? 0) - (b.confidence_rating ?? 0)
      case 'confidence_desc': return (b.confidence_rating ?? 0) - (a.confidence_rating ?? 0)
      default:                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  return list
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ErrorLogClient() {
  const { errors, loading, reload } = useErrorLogs()

  const [addOpen, setAddOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [subject, setSubject] = React.useState('all')
  const [category, setCategory] = React.useState('all')
  const [errorType, setErrorType] = React.useState('all')
  const [mastered, setMastered] = React.useState('all')
  const [sortBy, setSortBy] = React.useState<SortKey>('newest')
  const [tab, setTab] = React.useState<'active' | 'archived'>('active')
  const [filtersOpen, setFiltersOpen] = React.useState(false)

  const hasFilters = subject !== 'all' || category !== 'all' || errorType !== 'all' || mastered !== 'all'

  function clearFilters() {
    setSubject('all'); setCategory('all'); setErrorType('all'); setMastered('all')
  }

  const displayErrors = React.useMemo(() =>
    applyFiltersAndSort(errors, { search, subject, category, errorType, mastered, sortBy, tab }),
    [errors, search, subject, category, errorType, mastered, sortBy, tab]
  )

  const activeCount   = errors.filter(e => !e.archived).length
  const archivedCount = errors.filter(e => e.archived === true).length

  const domainOptions = ALL_DOMAINS.filter(d => subject === 'all' || d.subject === subject)

  return (
    <div className="space-y-4">

      {/* Summary card */}
      {!loading && errors.length > 0 && <FrequencySummary errors={errors} />}

      {/* Domain pie + trend line charts */}
      {!loading && errors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DomainPieChart errors={errors} />
          <MistakeTrendChart errors={errors} />
        </div>
      )}

      {/* Top bar: search + Log Error */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search errors…"
            className="pl-9 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className={cn('gap-1.5 shrink-0 h-9', filtersOpen && 'bg-[var(--surface-sunken)]')}
          onClick={() => setFiltersOpen(v => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasFilters && (
            <span className="ml-0.5 h-4 w-4 rounded-full bg-[var(--accent)] text-[9px] text-white flex items-center justify-center font-semibold">
              {[subject, category, errorType, mastered].filter(v => v !== 'all').length}
            </span>
          )}
        </Button>

        <Button size="sm" className="gap-1.5 shrink-0 h-9" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Log Error</span>
        </Button>
      </div>

      {/* Collapsible filters panel */}
      {filtersOpen && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Select value={subject} onValueChange={v => { setSubject(v); setCategory('all') }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections</SelectItem>
                  <SelectItem value="math">Math</SelectItem>
                  <SelectItem value="reading_writing">Reading & Writing</SelectItem>
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Domain" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All domains</SelectItem>
                  {domainOptions.map(d => (
                    <SelectItem key={d.value} value={d.label}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={errorType} onValueChange={setErrorType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Mistake type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All mistake types</SelectItem>
                  {ERROR_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={mastered} onValueChange={setMastered}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="unmastered">To review</SelectItem>
                  <SelectItem value="mastered">Mastered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted-foreground)]">Sort by</span>
                <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
                  <SelectTrigger className="h-7 text-xs w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="category">Category A–Z</SelectItem>
                    <SelectItem value="type">Mistake type</SelectItem>
                    <SelectItem value="confidence_asc">Confidence: low → high</SelectItem>
                    <SelectItem value="confidence_desc">Confidence: high → low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <button
                  className="text-xs text-[var(--accent)] hover:underline"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active / Archived tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as 'active' | 'archived')}>
        <div className="flex items-center justify-between">
          <TabsList className="h-8">
            <TabsTrigger value="active" className="h-6 text-xs px-3">
              Active
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0">{activeCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="h-6 text-xs px-3">
              Archived
              {archivedCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0">{archivedCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <p className="text-xs text-[var(--muted-foreground)]">
            {displayErrors.length} {displayErrors.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        <TabsContent value="active">
          <ErrorList errors={displayErrors} loading={loading} onReload={reload} onAdd={() => setAddOpen(true)} />
        </TabsContent>

        <TabsContent value="archived">
          <ErrorList errors={displayErrors} loading={loading} onReload={reload} onAdd={() => setAddOpen(true)} isArchiveView />
        </TabsContent>
      </Tabs>

      <AddErrorDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={reload} />
    </div>
  )
}

// ─── Error List sub-component ─────────────────────────────────────────────────

function ErrorList({
  errors,
  loading,
  onReload,
  onAdd,
  isArchiveView = false,
}: {
  errors: ErrorLog[]
  loading: boolean
  onReload: () => void
  onAdd: () => void
  isArchiveView?: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-3 mt-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    )
  }

  if (errors.length === 0) {
    return (
      <Card className="mt-2">
        <CardContent className="py-14 text-center">
          {isArchiveView ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-3">
                <Archive className="h-5 w-5 text-[var(--muted-foreground)]" />
              </div>
              <p className="font-medium">No archived errors</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Archive errors you&apos;ve permanently mastered to keep the active list focused.
              </p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-3">
                <ScrollText className="h-5 w-5 text-[var(--muted-foreground)]" />
              </div>
              <p className="font-medium">No errors match your filters</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Try adjusting your search or filters, or log a new error.
              </p>
              <Button className="mt-4 gap-1.5" onClick={onAdd}>
                <Plus className="h-4 w-4" />
                Log your first error
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 mt-2">
      {errors.map(error => (
        <ErrorRow key={error.id} error={error} onReload={onReload} />
      ))}
    </div>
  )
}
