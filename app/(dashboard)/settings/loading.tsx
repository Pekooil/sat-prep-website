import { Skeleton } from '@/components/ui/skeleton'

function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-[var(--card)] p-5 space-y-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-64" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 flex items-center justify-between gap-4">
            <div className="flex gap-3 items-center">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-6 w-11 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-8" aria-label="Loading settings…" aria-busy="true">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
      <div className="rounded-xl border bg-[var(--card)] p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
      </div>
    </div>
  )
}
