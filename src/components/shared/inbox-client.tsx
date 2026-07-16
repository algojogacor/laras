"use client"

import {
  Bell,
  MessageSquare,
  Mail,
  Users,
  UserPlus,
  ClipboardCheck,
  Megaphone,
  Building2,
  CheckCheck,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useTransition, useState, useCallback } from "react"
import { larasToast } from "@/lib/laras-toast"
import type { InboxEntry, InboxEntryType } from "@/lib/inbox"
import { apiClient } from "@/lib/api-client"

interface InboxClientProps {
  initialEntries: InboxEntry[]
  unreadTotal: number
  dict: Record<string, unknown>
}

const TYPE_ICONS: Record<InboxEntryType, LucideIcon> = {
  notification: Bell,
  message: MessageSquare,
  message_request: Mail,
  mentorship_request: Users,
  peer_review_request: ClipboardCheck,
  organization_invitation: Building2,
  announcement: Megaphone,
}

const TYPE_FILTERS: { value: InboxEntryType | "all"; labelKey: string }[] = [
  { value: "all", labelKey: "filterAll" },
  { value: "notification", labelKey: "filterNotifications" },
  { value: "message", labelKey: "filterMessages" },
  { value: "message_request", labelKey: "filterMessageRequests" },
  { value: "mentorship_request", labelKey: "filterMentorship" },
  { value: "peer_review_request", labelKey: "filterPeerReview" },
  { value: "organization_invitation", labelKey: "filterOrganizationInvitations" },
  { value: "announcement", labelKey: "filterAnnouncements" },
]

function createdAtLabel(createdAt: string | Date): string {
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function InboxClient({ initialEntries, unreadTotal, dict }: InboxClientProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState<InboxEntryType | "all">("all")
  const [entries, setEntries] = useState<InboxEntry[]>(initialEntries)

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.type === filter)

  const handleMarkAllRead = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await apiClient("/api/notifications", {
          method: "PATCH",
          body: JSON.stringify({ markAll: true }),
        })
        if (res.ok) {
          setEntries((prev) =>
            prev.map((e) => (e.type === "notification" ? { ...e, read: true } : e))
          )
          router.refresh()
        }
      } catch {
        larasToast.error("Failed to mark all as read")
      }
    })
  }, [router])

  const handleItemClick = useCallback(
    (entry: InboxEntry) => {
      if (entry.actionUrl) {
        router.push(entry.actionUrl)
      }
    },
    [router]
  )

  const t = dict as Record<string, Record<string, string>>

  if (entries.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {t.inbox?.empty ?? "No items in inbox"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map((f) => {
          const label = t.inbox?.[f.labelKey] ?? f.value
          return (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value)}
              className="h-8 text-xs"
            >
              {label}
            </Button>
          )
        })}
      </div>

      {/* Mark all read + unread count */}
      {unreadTotal > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {unreadTotal} {t.inbox?.markAllRead ? "unread" : "belum dibaca"}
          </p>
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={pending}>
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            {t.inbox?.markAllRead ?? "Mark all as read"}
          </Button>
        </div>
      )}

      {/* Entries */}
      {filtered.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t.inbox?.empty ?? "No items in inbox"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const Icon = TYPE_ICONS[entry.type] || Bell
            const isUnread = !entry.read

            return (
              <Card
                key={entry.id}
                className={cn(
                  "shadow-soft transition-colors cursor-pointer hover:bg-muted/50",
                  isUnread && "border-primary/30 bg-primary/5"
                )}
                onClick={() => handleItemClick(entry)}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      isUnread
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm", isUnread && "font-medium")}>
                        {entry.title}
                      </p>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    {entry.body && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {entry.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {createdAtLabel(entry.createdAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
