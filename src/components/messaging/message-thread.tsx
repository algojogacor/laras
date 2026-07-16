"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import {
  Send,
  MoreVertical,
  ShieldOff,
  Shield,
  Flag,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageData {
  id: string
  body: string
  senderId: string
  createdAt: string
  editedAt: string | null
}

interface OtherParticipant {
  id: string
  fullName: string | null
  photoUrl: string | null
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

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return "Hari ini"
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin"
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageThread({
  conversationId,
  currentProfileId,
  currentProfileName,
  initialMessages,
  otherParticipants,
  isBlocked,
  blockedByMe,
}: {
  conversationId: string
  currentProfileId: string
  currentProfileName: string | null
  initialMessages: MessageData[]
  otherParticipants: OtherParticipant[]
  isBlocked: boolean
  blockedByMe: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [messages, setMessages] = useState<MessageData[]>(initialMessages)
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [localBlocked, setLocalBlocked] = useState(isBlocked)
  const [localBlockedByMe, setLocalBlockedByMe] = useState(blockedByMe)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Send message
  async function handleSend() {
    const trimmed = body.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      const res = await apiClient(`/api/messages/${conversationId}`, {
        method: "POST",
        body: JSON.stringify({ body: trimmed }),
      })

      if (res.ok) {
        const data = await res.json()
        // Optimistically add message to the list
        setMessages((prev) => [
          ...prev,
          {
            id: data.messageId || `temp-${Date.now()}`,
            body: trimmed,
            senderId: currentProfileId,
            createdAt: new Date().toISOString(),
            editedAt: null,
          },
        ])
        setBody("")
      } else if (res.status === 429) {
        toast.error("Terlalu banyak pesan. Silakan tunggu sebentar.")
      } else {
        toast.error("Gagal mengirim pesan.")
      }
    } catch {
      toast.error("Gagal mengirim pesan.")
    } finally {
      setSending(false)
    }
  }

  // Handle Enter to send, Shift+Enter for newline
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Block / unblock
  async function handleToggleBlock() {
    setBlockLoading(true)
    try {
      if (localBlockedByMe) {
        // Unblock
        const res = await apiClient("/api/blocks", {
          method: "DELETE",
          body: JSON.stringify({ blockedId: otherParticipants[0]?.id }),
        })
        if (res.ok) {
          setLocalBlockedByMe(false)
          setLocalBlocked(false)
          toast.success("Pengguna berhasil diblokir.")
        } else {
          toast.error("Gagal membuka blokir.")
        }
      } else {
        // Block
        const res = await apiClient("/api/blocks", {
          method: "POST",
          body: JSON.stringify({ blockedId: otherParticipants[0]?.id }),
        })
        if (res.ok) {
          setLocalBlockedByMe(true)
          setLocalBlocked(true)
          toast.success("Pengguna berhasil diblokir.")
        } else {
          toast.error("Gagal memblokir pengguna.")
        }
      }
    } catch {
      toast.error("Gagal memproses.")
    } finally {
      setBlockLoading(false)
    }
  }

  // Report
  async function handleReport(reason: string) {
    try {
      const res = await apiClient("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType: "message",
          targetId: conversationId,
          reason,
        }),
      })
      if (res.ok) {
        toast.success("Laporan berhasil dikirim. Terima kasih.")
        setShowReportDialog(false)
      } else {
        toast.error("Gagal mengirim laporan.")
      }
    } catch {
      toast.error("Gagal mengirim laporan.")
    }
  }

  // Group messages by date
  const messagesByDate = messages.reduce<Map<string, MessageData[]>>((acc, m) => {
    const dateLabel = formatDate(m.createdAt)
    const group = acc.get(dateLabel) || []
    group.push(m)
    acc.set(dateLabel, group)
    return acc
  }, new Map())

  return (
    <Card className="shadow-soft flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Header with actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          {otherParticipants.slice(0, 3).map((p) => (
            <Avatar key={p.id} className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {initials(p.fullName)}
              </AvatarFallback>
            </Avatar>
          ))}
          <span className="text-sm font-medium">
            {otherParticipants.map((p) => p.fullName || "Unknown").join(", ")}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleToggleBlock}
              disabled={blockLoading}
            >
              {localBlockedByMe ? (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Buka Blokir
                </>
              ) : (
                <>
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Blokir Pengguna
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
              <Flag className="h-4 w-4 mr-2" />
              Laporkan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {localBlocked && !localBlockedByMe && (
          <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
            Anda tidak dapat mengirim pesan ke pengguna ini.
          </div>
        )}

        {Array.from(messagesByDate.entries()).map(([dateLabel, dateMessages]) => (
          <div key={dateLabel} className="space-y-2">
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {dateLabel}
              </span>
            </div>
            {dateMessages.map((m) => {
              const isMine = m.senderId === currentProfileId
              return (
                <div
                  key={m.id}
                  className={cn("flex gap-2", isMine ? "justify-end" : "justify-start")}
                >
                  {!isMine && (
                    <Avatar className="h-7 w-7 mt-1 flex-shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {initials(
                          otherParticipants.find((p) => p.id === m.senderId)
                            ?.fullName ?? null
                        )}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <span
                      className={cn(
                        "text-[10px] mt-1 block text-right",
                        isMine
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatTime(m.createdAt)}
                      {m.editedAt && " (diedit)"}
                    </span>
                  </div>
                  {isMine && (
                    <Avatar className="h-7 w-7 mt-1 flex-shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {initials(currentProfileName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada pesan. Kirim pesan pertama.
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t px-4 py-3">
        {localBlockedByMe ? (
          <div className="text-center text-sm text-muted-foreground py-2">
            Anda telah memblokir pengguna ini.
            <Button
              variant="link"
              size="sm"
              className="ml-1 h-auto p-0"
              onClick={handleToggleBlock}
              disabled={blockLoading}
            >
              Buka blokir
            </Button>
          </div>
        ) : localBlocked ? (
          <div className="text-center text-sm text-muted-foreground py-2">
            Anda diblokir oleh pengguna ini.
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis pesan..."
              className="min-h-[40px] max-h-[120px] resize-none"
              rows={1}
              disabled={sending}
              maxLength={5000}
            />
            <Button
              size="icon"
              className="flex-shrink-0"
              onClick={handleSend}
              disabled={sending || !body.trim()}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laporkan Percakapan</DialogTitle>
            <DialogDescription>
              Laporkan percakapan ini kepada moderator jika melanggar aturan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { value: "harassment", label: "Pelecehan" },
              { value: "spam", label: "Spam" },
              { value: "inappropriate", label: "Konten Tidak Pantas" },
              { value: "impersonation", label: "Peniruan Identitas" },
              { value: "other", label: "Lainnya" },
            ].map((reason) => (
              <Button
                key={reason.value}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleReport(reason.value)}
              >
                <Flag className="h-4 w-4 mr-2" />
                {reason.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
