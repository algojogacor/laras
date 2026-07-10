"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import {
  User,
  Briefcase,
  Wrench,
  GraduationCap,
  Languages,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react"
import type { DimensionKey, DimensionScore } from "@/lib/readiness"
import { cn } from "@/lib/utils"

const DIMENSION_ICONS: Record<DimensionKey, LucideIcon> = {
  basics: User,
  experience: Briefcase,
  skills: Wrench,
  education: GraduationCap,
  languages: Languages,
  preferences: SlidersHorizontal,
}

/** Differentiate colours: complete=success, partial=primary, low=muted. */
function barColor(score: number) {
  if (score >= 100) return "bg-chart-2" // success green — distinct from primary
  if (score >= 50) return "bg-primary"
  if (score >= 25) return "bg-chart-4"
  return "bg-muted-foreground/40"
}

export interface CompletenessBreakdownProps {
  dimensions: DimensionScore[]
  labels: Record<DimensionKey, string>
  hints: Record<DimensionKey, string>
  /** Label shown when a dimension is fully complete. */
  completeLabel: string
}

export function CompletenessBreakdown({
  dimensions,
  labels,
  hints,
  completeLabel,
}: CompletenessBreakdownProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
      {dimensions.map((d, i) => {
        const Icon = DIMENSION_ICONS[d.key]
        const isComplete = d.score >= 100
        return (
          <motion.div
            key={d.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-3 transition-colors",
              isComplete
                ? "border-chart-2/30 bg-chart-2/[0.04]"
                : "border-border bg-card/50 hover:border-primary/30 hover:bg-primary/[0.03]"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    isComplete
                      ? "bg-chart-2/15 text-chart-2"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="truncate text-xs font-medium">{labels[d.key]}</span>
              </div>
              {isComplete ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-chart-2 text-background">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : (
                <span className="shrink-0 font-serif text-sm font-semibold tabular-nums text-muted-foreground">
                  {d.score}%
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn("h-full rounded-full", barColor(d.score))}
                initial={{ width: 0 }}
                animate={{ width: `${d.score}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 + 0.05 * i }}
              />
            </div>
            {/* Hint — wraps on mobile instead of truncating */}
            <p className="mt-1.5 text-[10px] leading-tight text-muted-foreground line-clamp-2">
              {isComplete ? completeLabel : hints[d.key]}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}
