"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import {
  Search,
  Loader2,
  UserPlus,
  Check,
  X,
  Clock,
  Users,
  UserCheck,
  Send,
  MessageCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { larasToast } from "@/lib/laras-toast"
import { cn } from "@/lib/utils"

type ConnectionStatus = "pending" | "accepted" | "declined" | "blocked" | "none"

interface ConnectionUser {
  id: string
  status: ConnectionStatus
  message: string | null
  other: {
    id: string
    fullName: string | null
    headline: string | null
    email: string | null
    photoUrl: string | null
  }
  isRequester: boolean
}

interface SearchResult {
  id: string
  fullName: string | null
  headline: string | null
  email: string | null
  photoUrl: string | null
  connectionStatus: ConnectionStatus
}

interface ConnectionsLabels {
  title: string
  subtitle: string
  accepted: string
  pendingIncoming: string
  pendingOutgoing: string
  noConnections: string
  noIncoming: string
  noOutgoing: string
  connect: string
  accept: string
  decline: string
  pending: string
  search: string
  searchResults: string
  noResults: string
  alreadyConnected: string
  alreadyPending: string
  connectSent: string
  connectError: string
  acceptSuccess: string
  declineSuccess: string
  actionError: string
  messageLabel: string
  messagePlaceholder: string
  send: string
  statsTotal: string
  statsPending: string
  statsOutgoing: string
}

function initials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

export function ConnectionsPanel({
  initialData,
  labels,
}: {
  initialData: {
    accepted: ConnectionUser[]
    pendingIncoming: ConnectionUser[]
    pendingOutgoing: ConnectionUser[]
  }
  labels: ConnectionsLabels
}) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [message, setMessage] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleSearch = () => {
    const q = search.trim()
    if (!q) return
    setSearching(true)
    setSearched(false)
    apiClient(`/api/connections?q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        setResults(d.results)
        setSearched(true)
        setSearching(false)
      })
      .catch(() => {
        setResults([])
        setSearched(true)
        setSearching(false)
      })
  }

  const handleConnect = (targetId: string) => {
    const msg = message[targetId] ?? ""
    startTransition(async () => {
      try {
        const res = await apiClient("/api/connections", {
          method: "POST",
          body: JSON.stringify({ addresseeId: targetId, message: msg || undefined }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error ?? "failed")
        }
        larasToast.success(labels.connectSent)
        setResults((prev) =>
          prev.map((r) => (r.id === targetId ? { ...r, connectionStatus: "pending" } : r))
        )
        router.refresh()
      } catch {
        larasToast.error(labels.connectError)
      }
    })
  }

  const handleAction = (connectionId: string, action: "accept" | "decline") => {
    startTransition(async () => {
      try {
        const res = await apiClient(`/api/connections/${connectionId}`, {
          method: "PATCH",
          body: JSON.stringify({ action }),
        })
        if (!res.ok) throw new Error("failed")
        if (action === "accept") {
          setData((prev) => {
            const conn = prev.pendingIncoming.find((c) => c.id === connectionId)
            if (!conn) return prev
            return {
              accepted: [...prev.accepted, { ...conn, status: "accepted" }],
              pendingIncoming: prev.pendingIncoming.filter((c) => c.id !== connectionId),
              pendingOutgoing: prev.pendingOutgoing,
            }
          })
          larasToast.success(labels.acceptSuccess)
        } else {
          setData((prev) => ({
            ...prev,
            pendingIncoming: prev.pendingIncoming.filter((c) => c.id !== connectionId),
          }))
          larasToast.success(labels.declineSuccess)
        }
        router.refresh()
      } catch {
        larasToast.error(labels.actionError)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} label={labels.statsTotal} value={data.accepted.length} />
        <StatCard icon={UserPlus} label={labels.statsPending} value={data.pendingIncoming.length} />
        <StatCard icon={Send} label={labels.statsOutgoing} value={data.pendingOutgoing.length} />
      </div>

      {/* Search */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-base">{labels.search}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={labels.search}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching || !search.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {searched && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {labels.searchResults}
              </p>
              {results.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{labels.noResults}</p>
              ) : (
                results.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initials(r.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.fullName || r.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.headline || r.email}</p>
                        </div>
                      </div>
                      {r.connectionStatus === "accepted" ? (
                        <StatusBadge text={labels.alreadyConnected} variant="success" icon={Check} />
                      ) : r.connectionStatus === "pending" ? (
                        <StatusBadge text={labels.alreadyPending} variant="muted" icon={Clock} />
                      ) : (
                        <Button size="sm" onClick={() => handleConnect(r.id)} disabled={pending}>
                          <UserPlus className="mr-1 h-3.5 w-3.5" />
                          {labels.connect}
                        </Button>
                      )}
                    </div>
                    {r.connectionStatus === "none" && (
                      <div className="mt-2 flex gap-2">
                        <Input
                          value={message[r.id] ?? ""}
                          onChange={(e) => setMessage((m) => ({ ...m, [r.id]: e.target.value }))}
                          placeholder={labels.messagePlaceholder}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incoming requests */}
      {data.pendingIncoming.length > 0 && (
        <ConnectionSection title={labels.pendingIncoming} icon={UserPlus}>
          {data.pendingIncoming.map((c) => (
            <ConnectionRow
              key={c.id}
              name={c.other.fullName || c.other.email || "Unknown"}
              headline={c.other.headline || c.other.email || ""}
              initials={initials(c.other.fullName)}
              action={
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => handleAction(c.id, "accept")} disabled={pending}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    {labels.accept}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(c.id, "decline")} disabled={pending}>
                    <X className="mr-1 h-3.5 w-3.5" />
                    {labels.decline}
                  </Button>
                </div>
              }
            />
          ))}
        </ConnectionSection>
      )}

      {/* Accepted connections */}
      <ConnectionSection title={labels.accepted} icon={UserCheck}>
        {data.accepted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{labels.noConnections}</p>
        ) : (
          data.accepted.map((c) => (
            <ConnectionRow
              key={c.id}
              name={c.other.fullName || c.other.email || "Unknown"}
              headline={c.other.headline || c.other.email || ""}
              initials={initials(c.other.fullName)}
              action={
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/messages?connect=${c.other.id}`)}
                  >
                    <MessageCircle className="mr-1 h-3.5 w-3.5" />
                    Kirim Pesan
                  </Button>
                  <StatusBadge text={labels.alreadyConnected} variant="success" icon={Check} />
                </div>
              }
            />
          ))
        )}
      </ConnectionSection>

      {/* Outgoing requests */}
      {data.pendingOutgoing.length > 0 && (
        <ConnectionSection title={labels.pendingOutgoing} icon={Clock}>
          {data.pendingOutgoing.map((c) => (
            <ConnectionRow
              key={c.id}
              name={c.other.fullName || c.other.email || "Unknown"}
              headline={c.other.headline || c.other.email || ""}
              initials={initials(c.other.fullName)}
              action={<StatusBadge text={labels.pending} variant="muted" icon={Clock} />}
            />
          ))}
        </ConnectionSection>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-serif text-xl font-semibold tabular-nums leading-none">{value}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ConnectionSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Users
  children: React.ReactNode
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  )
}

function ConnectionRow({
  name,
  headline,
  initials,
  action,
}: {
  name: string
  headline: string
  initials: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 p-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{headline}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function StatusBadge({
  text,
  variant,
  icon: Icon,
}: {
  text: string
  variant: "success" | "muted"
  icon: typeof Check
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        variant === "success" ? "bg-chart-2/15 text-chart-2" : "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {text}
    </span>
  )
}
