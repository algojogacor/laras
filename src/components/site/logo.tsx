import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      {/* trajectory arc rising toward a node */}
      <path
        d="M6 30 C 12 30, 18 24, 22 16 S 30 6, 34 8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="text-primary"
      />
      <circle cx="34" cy="8" r="3.4" className="fill-accent" />
      <circle cx="6" cy="30" r="2.6" className="fill-primary" />
    </svg>
  )
}

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark && (
        <span className="font-serif text-xl font-semibold tracking-tight">
          Laras
        </span>
      )}
    </span>
  )
}
