export default function MessagesLoading() {
  return (
    <div className="space-y-6 animate-rise" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-9 w-48 animate-pulse rounded-md bg-secondary" />
        <div className="h-5 w-72 animate-pulse rounded-md bg-secondary/70" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-border/60 p-4"
          >
            <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded-md bg-secondary" />
              <div className="h-3 w-full animate-pulse rounded-md bg-secondary/70" />
            </div>
            <div className="h-3 w-12 animate-pulse rounded-md bg-secondary/50" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading messages…</span>
    </div>
  )
}
