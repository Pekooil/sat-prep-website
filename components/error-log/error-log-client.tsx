'use client'

import * as React from 'react'
import { Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useErrorLogs } from '@/hooks/use-error-logs'
import { AddErrorDialog } from './add-error-dialog'
import { ErrorRow } from './error-row'
import { MATH_DOMAINS, RW_DOMAINS, ERROR_TYPES } from '@/lib/constants'

const ALL_DOMAINS = [
  ...MATH_DOMAINS.map(d => ({ ...d, subject: 'math' })),
  ...RW_DOMAINS.map(d => ({ ...d, subject: 'reading_writing' })),
]

export function ErrorLogClient() {
  const [addOpen, setAddOpen] = React.useState(false)
  const { errors, loading, filters, setFilters, reload } = useErrorLogs()

  const masteredCount = errors.filter(e => e.mastered).length
  const unmasteredCount = errors.filter(e => !e.mastered).length

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="text-sm text-[var(--muted-foreground)]">{unmasteredCount} to review</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-sm text-[var(--muted-foreground)]">{masteredCount} mastered</span>
        </div>
        <div className="ml-auto">
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Log Error
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Select
              value={filters.subject ?? 'all'}
              onValueChange={v => setFilters(f => ({ ...f, subject: v === 'all' ? undefined : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                <SelectItem value="math">Math</SelectItem>
                <SelectItem value="reading_writing">Reading & Writing</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.category ?? 'all'}
              onValueChange={v => setFilters(f => ({ ...f, category: v === 'all' ? undefined : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {ALL_DOMAINS
                  .filter(d => !filters.subject || d.subject === filters.subject)
                  .map(d => (
                    <SelectItem key={d.value} value={d.label}>{d.label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.error_type ?? 'all'}
              onValueChange={v => setFilters(f => ({ ...f, error_type: v === 'all' ? undefined : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Error type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {ERROR_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.mastered === true ? 'mastered' : filters.mastered === false ? 'unmastered' : 'all'}
              onValueChange={v => setFilters(f => ({
                ...f,
                mastered: v === 'all' ? null : v === 'mastered',
              }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="unmastered">To review</SelectItem>
                <SelectItem value="mastered">Mastered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(filters.subject || filters.category || filters.error_type || filters.mastered !== null && filters.mastered !== undefined) && (
            <button
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-3"
              onClick={() => setFilters({})}
            >
              Clear all filters
            </button>
          )}
        </CardContent>
      </Card>

      {/* Error list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : errors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-2xl mb-2">📝</p>
            <p className="font-medium text-[var(--foreground)]">No errors logged yet</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Track your mistakes to spot patterns and improve faster.
            </p>
            <Button className="mt-4 gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Log your first error
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {errors.map(error => (
            <ErrorRow key={error.id} error={error} onReload={reload} />
          ))}
        </div>
      )}

      <AddErrorDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={reload} />
    </div>
  )
}
