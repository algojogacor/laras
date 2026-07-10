"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Megaphone, AlertCircle, Info, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Priority = "low" | "normal" | "high" | "urgent"

interface Announcement {
  id: string
  title: string
  body: string
  audience: string
  priority: Priority
  publishedAt: string | null
}

interface AnnouncementFeedProps {
  initialAnnouncements: Announcement[]
  labels: {
    feedTitle: string
    feedEmpty: string
  }
}

const PRIORITY_CONFIG: Record<Priority, { icon: typeof Info; cardClass: string; iconClass: string }> = {
  urgent: { icon: AlertCircle, cardClass: "border-destructive/30 bg-destructive/[0.04]", iconClass: "text-destructive" },
  high: { icon: AlertTriangle, cardClass: "border-chart-4/30 bg-chart-4/[0.04]", iconClass: "text-chart-4" },
  normal: { icon: Megaphone, cardClass: "border-primary/20 bg-primary/[0.03]", iconClass: "text-primary" },
  low: { icon: Info, cardClass: "border-border bg-card/50", iconClass: "text-muted-foreground" },
}

export function AnnouncementFeed({ initialAnnouncements, labels }: AnnouncementFeedProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (initialAnnouncements.length === 0) return null

  return (
    <section>
      <h2 className="font-serif text-xl font-semibold">{labels.feedTitle}</h2>
      <div className="mt-4 space-y-2">
        {initialAnnouncements.map((a, i) => {
          const config = PRIORITY_CONFIG[a.priority]
          const Icon = config.icon
          const isExpanded = expanded === a.id
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
            >
              <Card className={cn("shadow-soft transition-all", config.cardClass)}>
                <CardContent className="p-4">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : a.id)}
                    className="flex w-full items-start gap-3 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.iconClass, "bg-background/60")}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug">{a.title}</p>
                      <p className={cn("text-xs text-muted-foreground", isExpanded ? "" : "line-clamp-1")}>
                        {a.body}
                      </p>
                      {a.publishedAt && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(a.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {a.body.length > 80 && (
                      <div className="shrink-0 pt-0.5 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    )}
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
