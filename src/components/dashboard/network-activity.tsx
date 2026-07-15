"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { UserCheck, UserPlus, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface NetworkEvent {
  id: string
  type: "connection-accepted" | "new-connection"
  name: string
  headline: string | null
  timestamp: Date
  profileId: string
}

interface NetworkActivityProps {
  events: NetworkEvent[]
  labels: {
    title: string
    empty: string
    acceptedLabel: string
    newConnectionLabel: string
    viewAll: string
  }
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NetworkActivity({ events, labels }: NetworkActivityProps) {
  if (events.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <UserCheck className="h-4 w-4 text-primary" />
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
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <UserCheck className="h-4 w-4 text-primary" />
          {labels.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.slice(0, 4).map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.04 * i }}
          >
            <div className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/10 hover:bg-primary/[0.02]">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chart-2/15 text-chart-2"
                aria-hidden="true"
              >
                {event.type === "connection-accepted" ? (
                  <UserCheck className="h-3.5 w-3.5" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {event.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {event.headline || (event.type === "connection-accepted" ? labels.acceptedLabel : labels.newConnectionLabel)}
                </p>
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {timeAgo(event.timestamp)}
              </span>
            </div>
          </motion.div>
        ))}
        <Button asChild variant="ghost" size="sm" className="mt-2 w-full text-xs">
          <Link href="/connections">
            {labels.viewAll}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
