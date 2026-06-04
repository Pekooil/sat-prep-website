import { Skeleton } from '@/components/ui/skeleton'

export default function CalendarLoading() {
  return (
    <div className="space-y-6" aria-label="Loading calendar…" aria-busy="true">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-1.5 h-4 w-72" />
      </div>
      {/* Calendar grid */}
      <div className="rounded-xl border bg-[var(--card)] p-4 space-y-3">
        {/* Month header + nav */}
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
        {/* Calendar cells — 5 weeks */}
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, col) => (
              <Skeleton key={col} className="h-14 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
