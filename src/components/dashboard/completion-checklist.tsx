"use client"

import Link from "next/link"
import { CheckCircle2, Circle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

/**
 * CompletionChecklist — shows users exactly which profile sections are complete
 * and which need attention. Clicking an incomplete item links to /profile.
 *
 * Replaces the bare percentage with an actionable breakdown.
 */

export type ChecklistItem = {
  key: string
  label: string
  done: boolean
  hint: string
}

export function CompletionChecklist({
  items,
  completion,
  locale,
}: {
  items: ChecklistItem[]
  completion: number
  locale: "id" | "en"
}) {
  const doneCount = items.filter((i) => i.done).length
  const t = locale === "id" ? {
    title: "Kelengkapan profil",
    desc: "Lengkapi setiap bagian untuk hasil dokumen terbaik.",
    complete: "Lengkap",
    incomplete: "Belum lengkap",
    cta: "Lengkapi profil",
    remaining: (n: number) => `${n} bagian tersisa`,
  } : {
    title: "Profile completeness",
    desc: "Complete each section for the best document results.",
    complete: "Complete",
    incomplete: "Incomplete",
    cta: "Complete profile",
    remaining: (n: number) => `${n} section${n > 1 ? "s" : ""} remaining`,
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-serif text-base">{t.title}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
          </div>
          <div className="text-right">
            <div className="font-serif text-3xl font-semibold tabular-nums text-primary">{completion}%</div>
          </div>
        </div>
        <Progress value={completion} className="mt-2 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.key}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
              item.done ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-muted/40 hover:bg-muted"
            )}
          >
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium leading-tight", item.done ? "text-foreground" : "text-foreground")}>
                {item.label}
              </p>
              {!item.done && (
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight">{item.hint}</p>
              )}
            </div>
            <span className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
              item.done
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
            )}>
              {item.done ? t.complete : t.incomplete}
            </span>
          </div>
        ))}
        {doneCount < items.length && (
          <div className="pt-2">
            <p className="mb-2 text-center text-[11px] text-muted-foreground">{t.remaining(items.length - doneCount)}</p>
            <Button asChild size="sm" className="w-full gap-1.5">
              <Link href="/profile">
                {t.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
