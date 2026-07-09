"use client"

import { useT } from "@/components/providers/locale-provider"
import { cn } from "@/lib/utils"
import { CheckCircle2, AlertTriangle, Info, Lightbulb } from "lucide-react"
import type { concretenessCheck } from "@/lib/content-engine"

type CheckResult = ReturnType<typeof concretenessCheck>

export function ConcretenessPanel({ check }: { check: CheckResult }) {
  const t = useT()
  const verdict = check.verdict
  const verdictText =
    verdict === "good" ? t.documents.concretenessGood : verdict === "fair" ? t.documents.concretenessFair : t.documents.concretenessWeak
  const verdictColor =
    verdict === "good"
      ? "text-emerald-600"
      : verdict === "fair"
        ? "text-amber-600"
        : "text-red-600"

  return (
    <div className="space-y-4">
      {/* Score ring */}
      <div className="flex items-center gap-4">
        <ScoreRing score={check.score} verdict={verdict} />
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{t.documents.concretenessScore}</p>
          <p className={cn("text-sm font-medium", verdictColor)}>{verdictText}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {check.withEvidence}/{check.totalBullets} {t.documents.bulletsWithEvidence}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          label={t.documents.bulletsWithEvidence}
          value={check.withEvidence}
        />
        <Stat
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          label={t.documents.buzzwordWarnings}
          value={check.buzzwordNoEvidence}
        />
      </div>

      {/* Warnings list */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Lightbulb className="h-4 w-4 text-primary" />
          {t.documents.warnings}
        </p>
        {check.flagged.length === 0 ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
            {t.documents.noWarnings}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {check.flagged.map((f, i) => (
              <li key={i} className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ScoreRing({ score, verdict }: { score: number; verdict: string }) {
  const color =
    verdict === "good" ? "#059669" : verdict === "fair" ? "#d97706" : "#dc2626"
  const r = 28
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
        <circle
          cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-lg font-semibold" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 font-serif text-xl font-semibold">{value}</p>
    </div>
  )
}
