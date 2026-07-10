"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ReadinessRingProps {
  score: number // 0–100
  level: string // i18n label
  levelDescription: string // i18n description
  size?: number
  className?: string
}

const LEVEL_COLORS: Record<string, { stroke: string; glow: string; text: string }> = {
  // Indexed by level key — but we receive the i18n label, so we key by score
  // thresholds at runtime instead. Kept here for potential future use.
}

function colorForScore(score: number) {
  if (score >= 75)
    return { stroke: "hsl(var(--chart-2))", glow: "hsl(var(--chart-2) / 0.25)", text: "text-chart-2" }
  if (score >= 50)
    return { stroke: "hsl(var(--chart-1))", glow: "hsl(var(--chart-1) / 0.25)", text: "text-chart-1" }
  if (score >= 25)
    return { stroke: "hsl(var(--chart-4))", glow: "hsl(var(--chart-4) / 0.25)", text: "text-chart-4" }
  return { stroke: "hsl(var(--muted-foreground))", glow: "hsl(var(--muted-foreground) / 0.2)", text: "text-muted-foreground" }
}

export function ReadinessRing({
  score,
  level,
  levelDescription,
  size = 180,
  className,
}: ReadinessRingProps) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const colors = colorForScore(score)

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: colors.glow }}
        aria-hidden
      />
      <svg
        width={size}
        height={size}
        className="relative -rotate-90"
        role="img"
        aria-label={`${level}: ${score}%`}
      >
        <defs>
          <linearGradient id="readiness-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#readiness-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span
          className="font-serif text-4xl font-bold tabular-nums"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <span className={colors.text}>{score}</span>
          <span className="text-lg text-muted-foreground">%</span>
        </motion.span>
        <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {level}
        </span>
      </div>
      <span className="sr-only">{levelDescription}</span>
    </div>
  )
}
