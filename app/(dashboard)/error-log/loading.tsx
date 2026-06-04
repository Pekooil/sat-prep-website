import { Skeleton } from '@/components/ui/skeleton'

export default function ErrorLogLoading() {
  return (
    <div className="space-y-6" aria-label="Loading error log…" aria-busy="true">
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-1.5 h-4 w-80" />
      </div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>
      {/* Error list */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-[var(--card)] p-4 flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
