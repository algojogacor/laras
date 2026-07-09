"use client"

import { useT } from "@/components/providers/locale-provider"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEP_KEYS = [
  "s1Title",
  "s2Title",
  "s3Title",
  "s4Title",
  "s5Title",
] as const

export function StepIndicator({
  current,
  total,
}: {
  current: number // 0-based
  total: number
}) {
  const t = useT()
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < current
        const isCurrent = i === current
        const label = t.onboarding[STEP_KEYS[i]]
        return (
          <li key={i} className="flex flex-1 items-center gap-1.5 sm:gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors sm:h-7 sm:w-7 sm:text-xs",
                    isDone && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-primary/10 text-primary",
                    !isDone && !isCurrent && "border-border bg-background text-muted-foreground"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-xs font-medium sm:text-sm",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isDone || isCurrent ? "bg-primary" : "bg-transparent"
                  )}
                  style={{ width: isDone ? "100%" : isCurrent ? "55%" : "0%" }}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
