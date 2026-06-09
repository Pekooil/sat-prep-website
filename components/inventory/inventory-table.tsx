'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { InventoryItemWithStats } from '@/actions/question-inventory'

type SortKey = keyof InventoryItemWithStats
type SortDir = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function remainingBadgeClass(remaining: number, available: number): string {
  const pct = available > 0 ? remaining / available : 1
  if (pct > 0.5)  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  if (pct > 0.2)  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
}

function difficultyBadgeClass(diff: string): string {
  if (diff === 'easy')   return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  if (diff === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
}

interface Props {
  items: InventoryItemWithStats[]
}

export function InventoryTable({ items }: Props) {
  const [search, setSearch]       = useState('')
  const [sectionFilter, setSection] = useState('all')
  const [diffFilter, setDiff]     = useState('all')
  const [sortKey, setSortKey]     = useState<SortKey>('section')
  const [sortDir, setSortDir]     = useState<SortDir>('asc')
  const [page, setPage]           = useState(1)
  const [pageSize, setPageSize]   = useState(25)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(i => {
      if (sectionFilter !== 'all' && i.section !== sectionFilter) return false
      if (diffFilter   !== 'all' && i.difficulty !== diffFilter)  return false
      if (q && ![i.section, i.domain, i.skill, i.difficulty].some(s => s.toLowerCase().includes(q))) return false
      return true
    })
  }, [items, search, sectionFilter, diffFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageItems  = sorted.slice((page - 1) * pageSize, page * pageSize)

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-[var(--accent)]" />
      : <ChevronDown className="h-3 w-3 text-[var(--accent)]" />
  }

  const colClass = 'px-3 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide cursor-pointer select-none hover:text-[var(--foreground)] transition-colors'
  const tdClass  = 'px-3 py-2.5 text-sm text-[var(--foreground)]'

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search domain, skill…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-9 text-sm bg-[var(--card)] border-[var(--border)]"
          />
        </div>
        <Select value={sectionFilter} onValueChange={v => { setSection(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[180px] text-sm bg-[var(--card)] border-[var(--border)]">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sections</SelectItem>
            <SelectItem value="Reading and Writing">Reading &amp; Writing</SelectItem>
            <SelectItem value="Math">Math</SelectItem>
          </SelectContent>
        </Select>
        <Select value={diffFilter} onValueChange={v => { setDiff(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[150px] text-sm bg-[var(--card)] border-[var(--border)]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1) }}>
          <SelectTrigger className="h-9 w-[100px] text-sm bg-[var(--card)] border-[var(--border)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(n => (
              <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-[var(--muted-foreground)] ml-auto">
          {filtered.length} row{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-sunken)] border-b border-[var(--border)]">
              <tr>
                {(
                  [
                    ['section', 'Section'],
                    ['domain', 'Domain'],
                    ['skill', 'Skill'],
                    ['difficulty', 'Difficulty'],
                    ['available_count', 'Available'],
                    ['assigned', 'Assigned'],
                    ['completed', 'Completed'],
                    ['remaining', 'Remaining'],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th key={key} className={colClass} onClick={() => handleSort(key)}>
                    <span className="flex items-center gap-1">
                      {label}
                      <SortIcon col={key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-[var(--muted-foreground)]">
                    No matching rows
                  </td>
                </tr>
              ) : pageItems.map(item => {
                const remPct = item.available_count > 0 ? item.remaining / item.available_count : 1
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'hover:bg-[var(--surface-sunken)] transition-colors',
                      remPct < 0.2 && 'bg-red-500/[0.06]',
                    )}
                  >
                    <td className={tdClass}>
                      <span className="text-xs font-medium text-[var(--muted-foreground)]">
                        {item.section === 'Reading and Writing' ? 'R&W' : 'Math'}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="font-medium">{item.domain}</span>
                    </td>
                    <td className={tdClass}>
                      <span className="text-[var(--muted-foreground)]">{item.skill}</span>
                    </td>
                    <td className={tdClass}>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', difficultyBadgeClass(item.difficulty))}>
                        {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                      </span>
                    </td>
                    <td className={cn(tdClass, 'font-mono tabular-nums')}>{item.available_count}</td>
                    <td className={cn(tdClass, 'font-mono tabular-nums')}>{item.assigned}</td>
                    <td className={cn(tdClass, 'font-mono tabular-nums')}>{item.completed}</td>
                    <td className={tdClass}>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums', remainingBadgeClass(item.remaining, item.available_count))}>
                        {item.remaining}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-[var(--muted-foreground)]">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
