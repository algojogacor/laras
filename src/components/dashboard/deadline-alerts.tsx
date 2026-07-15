"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Clock, AlertTriangle, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface DeadlineAlert {
  id: string
  position: string
  organization: string | null
  deadline: string
  daysLeft: number
  status: string
}

interface DeadlineAlertsProps {
  alerts: DeadlineAlert[]
  labels: {
    title: string
    empty: string
    daysLeftSingular: string
    daysLeftPlural: string
    overdue: string
    today: string
    viewAll: string
  }
}

export function DeadlineAlerts({ alerts, labels }: DeadlineAlertsProps) {
  if (alerts.length === 0) {
    return (
      <Card className="shadow-soft" aria-live="polite">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            {labels.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-4">
          <p className="text-xs text-muted-foreground">{labels.empty}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-soft" aria-live="polite">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            {labels.title}
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {alerts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 4).map((alert, i) => {
          const isOverdue = alert.daysLeft < 0
          const isToday = alert.daysLeft === 0
          const urgencyLabel = isOverdue
            ? labels.overdue
            : isToday
              ? labels.today
              : `${alert.daysLeft} ${alert.daysLeft === 1 ? labels.daysLeftSingular : labels.daysLeftPlural}`

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 * i }}
            >
              <Link
                href={`/applications`}
                className="group flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-primary/20 hover:bg-primary/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium group-hover:text-primary">
                    {alert.position}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {alert.organization || "—"}
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      isOverdue
                        ? "text-destructive"
                        : isToday
                          ? "text-chart-4"
                          : "text-muted-foreground"
                    }`}
                  >
                    {isOverdue && <AlertTriangle className="h-3 w-3" />}
                    {urgencyLabel}
                  </span>
                </div>
              </Link>
            </motion.div>
          )
        })}
        <Button asChild variant="ghost" size="sm" className="mt-2 w-full text-xs">
          <Link href="/applications">
            {labels.viewAll}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
