"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  MessageCircle,
  Search,
  Loader2,
  UserPlus,
  Mail,
  Check,
  X,
  Clock,
  Send,
  Inbox,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationData {
  id: string
  title: string | null
  type: string
  updatedAt: string
  participants: Array<{
    id: string
    fullName: string | null
    photoUrl: string | null
  }>
  lastMessage: {
    body: string
    createdAt: string
    senderId: string
  } | null
  unreadCount: number
}

interface MessageRequestData {
  id: string
  senderId: string
  senderName: string | null
  senderPhotoUrl: string | null
  body: string
  status: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Baru saja"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}j`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}h`
  return date.toLocaleDateString("id-ID")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageList({
  conversations,
  messageRequests,
  currentProfileId,
}: {
  conversations: ConversationData[]
  messageRequests: MessageRequestData[]
  currentProfileId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Message request accept/decline handlers
  async function handleRequestAction(
    requestId: string,
    action: "accept" | "decline"
  ) {
    try {
      const res = await fetch(`/api/messages/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        if (action === "accept" && data.conversationId) {
          toast.success("Permintaan pesan diterima.")
          router.push(`/messages/${data.conversationId}`)
        } else {
          toast.success("Permintaan pesan ditolak.")
        }
        router.refresh()
      } else {
        toast.error("Gagal memproses permintaan.")
      }
    } catch {
      toast.error("Gagal memproses permintaan.")
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
      {/* Conversation list */}
      <div className="space-y-4">
        {/* Message Request Inbox */}
        {messageRequests.length > 0 && (
          <Card className="shadow-soft border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-serif text-base">
                <Inbox className="h-4 w-4 text-amber-600" />
                Permintaan Pesan ({messageRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {messageRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white border border-amber-100"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {initials(req.senderName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {req.senderName || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {req.body}
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleRequestAction(req.id, "accept")}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Terima
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => handleRequestAction(req.id, "decline")}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Tolak
                      </Button>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(req.createdAt)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Conversations */}
        {conversations.length === 0 && messageRequests.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-2">
              <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Belum ada percakapan. Hubungkan dengan sesama profesional untuk mulai.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/connections">Jelajahi Koneksi</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const otherParticipants = conv.participants.filter(
                (p) => p.id !== currentProfileId
              )
              const title =
                conv.title ||
                otherParticipants.map((p) => p.fullName || "Unknown").join(", ")

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group",
                    conv.unreadCount > 0 && "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs">
                      {initials(otherParticipants[0]?.fullName ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          conv.unreadCount > 0 && "font-semibold"
                        )}
                      >
                        {title}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {timeAgo(conv.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {conv.lastMessage
                        ? conv.lastMessage.body
                        : "Belum ada pesan"}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 mt-1 text-xs font-semibold text-white bg-primary rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Sidebar info */}
      <div className="hidden lg:block space-y-4">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-serif text-base">Pesan Profesional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Hanya koneksi yang terhubung dapat saling mengirim pesan langsung.
              Untuk pengguna yang belum terhubung, kirim permintaan pesan terlebih dahulu.
            </p>
            <p>
              Pengguna yang diblokir tidak dapat mengirim pesan kepada Anda.
            </p>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/connections">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Kelola Koneksi
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
