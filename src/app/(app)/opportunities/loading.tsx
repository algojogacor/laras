export default function OpportunitiesLoading() {
  return (
    <div className="space-y-6 animate-rise" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-56 animate-pulse rounded-md bg-secondary" />
          <div className="h-5 w-80 animate-pulse rounded-md bg-secondary/70" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-md bg-secondary" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-border/60 p-5"
          >
            <div className="h-5 w-40 animate-pulse rounded-md bg-secondary" />
            <div className="h-4 w-24 animate-pulse rounded-md bg-secondary/70" />
            <div className="h-4 w-full animate-pulse rounded-md bg-secondary/70" />
            <div className="mt-2 h-8 w-28 animate-pulse rounded-md bg-secondary/50" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading opportunities…</span>
    </div>
  )
}
