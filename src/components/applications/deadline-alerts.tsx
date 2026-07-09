"use client"

import Link from "next/link"
import { AlertTriangle, Clock, Calendar } from "lucide-react"
import { useT } from "@/components/providers/locale-provider"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AlertApp = {
  id: string
  position: string
  organization: string | null
  status: string
  deadline: string | null
}

function daysUntil(deadline: string): number {
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return 0
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function DeadlineAlerts({ applications }: { applications: AlertApp[] }) {
  const t = useT()

  const active = applications.filter((a) => a.deadline && a.status !== "rejected" && a.status !== "accepted")
  const overdue = active.filter((a) => daysUntil(a.deadline!) < 0)
  const upcoming = active.filter((a) => {
    const d = daysUntil(a.deadline!)
    return d >= 0 && d <= 7
  })

  if (overdue.length === 0 && upcoming.length === 0) return null

  const hasOverdue = overdue.length > 0

  return (
    <Card className={cn(
      "shadow-soft border-l-4",
      hasOverdue ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/20" : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            hasOverdue ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          )}>
            {hasOverdue ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div className="flex-1 space-y-2">
            <p className={cn("text-sm font-semibold", hasOverdue ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400")}>
              {t.dashboard.deadlineAlerts}
            </p>
            <div className="space-y-1.5">
              {overdue.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    {t.dashboard.overdueAlert}
                  </span>
                  <span className="font-medium text-foreground">{a.position}</span>
                  {a.organization && <span className="text-muted-foreground">· {a.organization}</span>}
                </div>
              ))}
              {upcoming.map((a) => {
                const d = daysUntil(a.deadline!)
                return (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                      <Calendar className="h-2.5 w-2.5" />
                      {d === 0 ? t.dashboard.soonAlert : `${d} ${t.applications.daysLeft}`}
                    </span>
                    <span className="font-medium text-foreground">{a.position}</span>
                    {a.organization && <span className="text-muted-foreground">· {a.organization}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
