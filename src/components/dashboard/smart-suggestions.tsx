"use client"

import Link from "next/link"
import { AlertTriangle, Sparkles, Clock, Target, BookOpen, CheckCircle2, ArrowRight } from "lucide-react"
import { useT } from "@/components/providers/locale-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Suggestion } from "@/lib/suggestions"

const ICONS = {
  alert: AlertTriangle,
  sparkles: Sparkles,
  clock: Clock,
  target: Target,
  book: BookOpen,
  check: CheckCircle2,
}

const PRIORITY_STYLE = {
  high: {
    card: "border-accent/30 bg-accent/5",
    icon: "bg-accent/15 text-accent",
  },
  medium: {
    card: "border-primary/20 bg-primary/5",
    icon: "bg-primary/10 text-primary",
  },
  low: {
    card: "border-border bg-card",
    icon: "bg-muted text-muted-foreground",
  },
}

export function SmartSuggestions({ suggestions }: { suggestions: Suggestion[] }) {
  const t = useT()

  if (suggestions.length === 0) return null

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-serif text-xl font-semibold">{t.dashboard.suggestionsTitle}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t.dashboard.suggestionsDesc}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {suggestions.map((s) => {
          const Icon = ICONS[s.icon]
          const style = PRIORITY_STYLE[s.priority]
          return (
            <Card key={s.id} className={cn("group shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift", style.card)}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", style.icon)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{s.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{s.desc}</p>
                  <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2 h-7 text-xs text-primary hover:bg-primary/5">
                    <Link href={s.href}>
                      {s.cta}
                      <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
