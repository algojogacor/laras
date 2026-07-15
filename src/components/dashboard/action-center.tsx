"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  UserPlus,
  UserCheck,
  MessageCircle,
  Clock,
  GraduationCap,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type ActionPriority = "urgent" | "high" | "medium" | "low"

export interface ActionItem {
  id: string
  priority: ActionPriority
  type: "connection-request" | "connection-accept" | "unread-message" | "deadline" | "mentorship-request" | "peer-review" | "onboarding-step"
  title: string
  description: string
  href: string
  cta: string
  count?: number
  deadline?: string // ISO date string for deadline items
}

interface ActionCenterProps {
  actions: ActionItem[]
  labels: {
    title: string
    empty: string
    acceptCta: string
    declineCta: string
    viewAllCta: string
    urgent: string
    high: string
    medium: string
    low: string
    daysLeft: string
    today: string
    overdue: string
  }
}

const TYPE_ICONS: Record<ActionItem["type"], LucideIcon> = {
  "connection-request": UserPlus,
  "connection-accept": UserCheck,
  "unread-message": MessageCircle,
  deadline: Clock,
  "mentorship-request": GraduationCap,
  "peer-review": ClipboardCheck,
  "onboarding-step": CheckCircle2,
}

const PRIORITY_STYLES: Record<ActionPriority, { border: string; bg: string; badge: string }> = {
  urgent: {
    border: "border-destructive/30",
    bg: "bg-destructive/[0.04]",
    badge: "bg-destructive text-destructive-foreground",
  },
  high: {
    border: "border-chart-4/30",
    bg: "bg-chart-4/[0.04]",
    badge: "bg-chart-4 text-chart-4-foreground",
  },
  medium: {
    border: "border-primary/20",
    bg: "bg-primary/[0.03]",
    badge: "bg-primary text-primary-foreground",
  },
  low: {
    border: "border-border",
    bg: "bg-card/50",
    badge: "bg-muted text-muted-foreground",
  },
}

function deadlineLabel(deadline: string | undefined, labels: ActionCenterProps["labels"]): string {
  if (!deadline) return ""
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return ""
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return labels.overdue
  if (diffDays === 0) return labels.today
  if (diffDays === 1) return `1 ${labels.daysLeft}`
  return `${diffDays} ${labels.daysLeft}`
}

export function ActionCenter({ actions, labels }: ActionCenterProps) {
  if (actions.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-soft" aria-live="polite" aria-label={labels.title}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-base font-semibold">{labels.title}</h3>
          <span className="text-xs text-muted-foreground">{actions.length} items</span>
        </div>
        <div className="space-y-2" role="list" aria-label={labels.title}>
          {actions.slice(0, 5).map((action, i) => {
            const Icon = TYPE_ICONS[action.type]
            const style = PRIORITY_STYLES[action.priority]
            const dl = deadlineLabel(action.deadline, labels)
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.04 * i }}
                role="listitem"
              >
                <div
                  className={cn(
                    "group flex items-start gap-3 rounded-lg border p-3 transition-all hover:shadow-sm",
                    style.border,
                    style.bg
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      "bg-background/80"
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{action.title}</p>
                      {action.count && action.count > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          {action.count}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {action.description}
                    </p>
                    {dl && (
                      <p className={cn(
                        "mt-0.5 text-[10px] font-medium",
                        dl === labels.overdue ? "text-destructive" : "text-chart-4"
                      )}>
                        {dl}
                      </p>
                    )}
                  </div>
                  <Link
                    href={action.href}
                    className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                    aria-label={`${action.cta}: ${action.title}`}
                  >
                    {action.cta}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
