import { Skeleton } from '@/components/ui/skeleton'

export function V2PageLoading({ label = 'Loading SaturnPath V2' }: { label?: string }) {
  return (
    <div className="space-y-8" aria-label={label} aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-9 w-64 max-w-full rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <Skeleton className="h-6 w-40 rounded-lg" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
    </div>
  )
}
