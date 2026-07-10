"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  FileText,
  ClipboardList,
  MessageSquareText,
  Headphones,
  type LucideIcon,
} from "lucide-react"
import type { ActivityItem, ActivityKind } from "@/lib/readiness"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  document: FileText,
  application: ClipboardList,
  interview: MessageSquareText,
  english: Headphones,
}

const KIND_COLOR: Record<ActivityKind, string> = {
  document: "bg-chart-1/15 text-chart-1",
  application: "bg-chart-2/15 text-chart-2",
  interview: "bg-chart-4/15 text-chart-4",
  english: "bg-chart-3/15 text-chart-3",
}

export interface ActivityTimelineProps {
  items: ActivityItem[]
  emptyMessage: string
  timeAgoLabels: { now: string; minutes: string; hours: string; days: string }
}

function relativeTime(date: Date, labels: ActivityTimelineProps["timeAgoLabels"]): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return labels.now
  if (mins < 60) return `${mins} ${labels.minutes}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ${labels.hours}`
  const days = Math.floor(hours / 24)
  return `${days} ${labels.days}`
}

export function ActivityTimeline({ items, emptyMessage, timeAgoLabels }: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-[160px] items-center justify-center">
        <p className="text-center text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ol className="relative space-y-1">
      {/* Vertical line */}
      <div
        className="pointer-events-none absolute bottom-2 left-[15px] top-2 w-px bg-border"
        aria-hidden
      />
      {items.map((item, i) => {
        const Icon = KIND_ICON[item.kind]
        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.04 * i }}
          >
            <Link
              href={item.href}
              className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
            >
              <div
                className={cn(
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background",
                  KIND_COLOR[item.kind]
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="truncate text-sm font-medium leading-snug group-hover:text-primary">
                  {item.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.subtitle}
                </p>
              </div>
              <span className="shrink-0 pt-0.5 text-[10px] tabular-nums text-muted-foreground">
                {relativeTime(item.timestamp, timeAgoLabels)}
              </span>
            </Link>
          </motion.li>
        )
      })}
    </ol>
  )
}
