'use client'

import * as React from 'react'
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useErrorLogs } from '@/hooks/use-error-logs'
import { AddErrorDialog } from './add-error-dialog'
import { ErrorRow } from './error-row'
import { MistakeTypeBadge } from './mistake-type-badge'
import type { MistakeTypeKey } from './mistake-type-badge'
import { MATH_DOMAINS, RW_DOMAINS, ERROR_TYPES } from '@/lib/constants'
import type { ErrorLog } from '@/types'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'newest' | 'oldest' | 'category' | 'type' | 'confidence_asc' | 'confidence_desc'

const ALL_DOMAINS = [
  ...MATH_DOMAINS.map(d => ({ ...d, subject: 'math' as const })),
  ...RW_DOMAINS.map(d => ({ ...d, subject: 'reading_writing' as const })),
]

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
                <span className="text-xs text-[var(--muted-foreground)] shrink-0 font-mono">
                  {t.unmastered > 0 && (
                    <span className="text-red-500 mr-1">{t.unmastered} active</span>
                  )}
                  {t.total} total
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-400 dark:bg-slate-500 transition-all"
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
                {topCategories.map(([cat, count]) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 text-[10px] rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5"
                  >
                    {cat}
                    <span className="font-bold text-red-500">{count}</span>
                  </span>
                ))}
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
          className={cn('gap-1.5 shrink-0 h-9', filtersOpen && 'bg-slate-100 dark:bg-slate-800')}
          onClick={() => setFiltersOpen(v => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasFilters && (
            <span className="ml-0.5 h-4 w-4 rounded-full bg-blue-600 text-[9px] text-white flex items-center justify-center font-bold">
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
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
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
              <p className="text-2xl mb-2">📦</p>
              <p className="font-medium">No archived errors</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Archive errors you&apos;ve permanently mastered to keep the active list focused.
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl mb-2">📝</p>
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
