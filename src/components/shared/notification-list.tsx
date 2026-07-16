"use client"

import { Bell, UserPlus, Megaphone, Info, CheckCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { larasToast } from "@/lib/laras-toast"
import { apiClient } from "@/lib/api-client"

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  resourceType: string | null
  resourceId: string | null
  readAt: string | null
  createdAt: Date
}

const ICON_MAP: Record<string, typeof Bell> = {
  "connection.request": UserPlus,
  "connection.accepted": UserPlus,
  announcement: Megaphone,
  system: Info,
}

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      try {
        const res = await apiClient("/api/notifications", {
          method: "PATCH",
          body: JSON.stringify({ id }),
        })
        if (res.ok) router.refresh()
      } catch {
        larasToast.error("Gagal menandai notifikasi")
      }
    })
  }

  const handleMarkAll = () => {
    startTransition(async () => {
      try {
        const res = await apiClient("/api/notifications", {
          method: "PATCH",
          body: JSON.stringify({ markAll: true }),
        })
        if (res.ok) router.refresh()
      } catch {
        larasToast.error("Gagal menandai semua")
      }
    })
  }

  const unreadCount = items.filter((n) => !n.readAt).length

  if (items.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Belum ada notifikasi</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{unreadCount} belum dibaca</p>
          <Button variant="ghost" size="sm" onClick={handleMarkAll} disabled={pending}>
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            Tandai semua dibaca
          </Button>
        </div>
      )}

      {items.map((n) => {
        const Icon = ICON_MAP[n.type] || Bell
        const isUnread = !n.readAt

        return (
          <Card
            key={n.id}
            className={cn(
              "shadow-soft transition-colors",
              isUnread && "border-primary/30 bg-primary/5"
            )}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  isUnread ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", isUnread && "font-medium")}>{n.title}</p>
                {n.body && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {isUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => handleMarkRead(n.id)}
                  disabled={pending}
                >
                  Baca
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
