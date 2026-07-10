export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 animate-pulse rounded-md bg-secondary" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-secondary/70" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-border/60 p-5"
          >
            <div className="h-5 w-32 animate-pulse rounded-md bg-secondary" />
            <div className="h-4 w-full animate-pulse rounded-md bg-secondary/70" />
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-secondary/70" />
            <div className="mt-2 h-8 w-24 animate-pulse rounded-md bg-secondary/50" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
