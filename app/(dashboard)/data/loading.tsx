import { Skeleton } from '@/components/ui/skeleton'

function ChartSkeleton({ height = 'h-48' }: { height?: string }) {
  return (
    <div className={`rounded-xl border bg-[var(--card)] p-5 space-y-3`}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className={`w-full rounded-lg ${height}`} />
    </div>
  )
}

export default function DataLoading() {
  return (
    <div className="space-y-8 pb-12" aria-label="Loading analytics…" aria-busy="true">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-[var(--card)] p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Performance section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartSkeleton height="h-52" />
        <ChartSkeleton height="h-52" />
      </div>
      <ChartSkeleton height="h-36" />

      {/* Topic analysis */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartSkeleton height="h-64" />
        <ChartSkeleton height="h-64" />
      </div>

      {/* Mastery cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-[var(--card)] p-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
