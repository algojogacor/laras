"use client"

import { motion } from "framer-motion"
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

function barColor(score: number) {
  if (score >= 80) return "bg-chart-2"
  if (score >= 50) return "bg-chart-1"
  if (score >= 25) return "bg-chart-4"
  return "bg-muted-foreground/40"
}

export interface CompletenessBreakdownProps {
  dimensions: DimensionScore[]
  labels: Record<DimensionKey, string>
  hints: Record<DimensionKey, string>
}

export function CompletenessBreakdown({
  dimensions,
  labels,
  hints,
}: CompletenessBreakdownProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {dimensions.map((d, i) => {
        const Icon = DIMENSION_ICONS[d.key]
        return (
          <motion.div
            key={d.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className="group rounded-xl border border-border bg-card/50 p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-medium">{labels[d.key]}</span>
              </div>
              <span className="font-serif text-sm font-semibold tabular-nums text-muted-foreground">
                {d.score}%
              </span>
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
            {/* Hint */}
            <p className="mt-1.5 text-[10px] leading-tight text-muted-foreground line-clamp-1">
              {d.score >= 100 ? "✓ " : d.score > 0 ? "" : ""}
              {hints[d.key]}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}
