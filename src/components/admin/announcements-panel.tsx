"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Megaphone,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Send,
  Archive,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { larasToast } from "@/lib/laras-toast"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"

type Audience = "all" | "free" | "pro" | "admin"
type Priority = "low" | "normal" | "high" | "urgent"
type Status = "draft" | "published" | "archived"

interface Announcement {
  id: string
  title: string
  body: string
  audience: Audience
  priority: Priority
  status: Status
  publishedAt: string | null
  createdAt: string
}

interface AnnouncementLabels {
  adminTitle: string
  adminDesc: string
  newAnnouncement: string
  editAnnouncement: string
  titleLabel: string
  bodyLabel: string
  audienceLabel: string
  priorityLabel: string
  statusLabel: string
  audienceAll: string
  audienceFree: string
  audiencePro: string
  audienceAdmin: string
  priorityLow: string
  priorityNormal: string
  priorityHigh: string
  priorityUrgent: string
  statusDraft: string
  statusPublished: string
  statusArchived: string
  publish: string
  unpublish: string
  archive: string
  delete: string
  save: string
  cancel: string
  created: string
  updated: string
  deleted: string
  error: string
  noAnnouncements: string
  statsPublished: string
  statsDraft: string
  statsUrgent: string
}

const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-chart-4/15 text-chart-4",
  urgent: "bg-destructive/15 text-destructive",
}

const STATUS_STYLE: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-chart-2/15 text-chart-2",
  archived: "bg-muted/60 text-muted-foreground line-through",
}

export function AnnouncementsPanel({ labels }: { labels: AnnouncementLabels }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "all" as Audience,
    priority: "normal" as Priority,
    status: "draft" as Status,
  })
  const [saving, startSave] = useTransition()
  const router = useRouter()

  if (!loaded) {
    apiClient("/api/admin/announcements")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => {
        setAnnouncements(d.announcements)
        setLoaded(true)
      })
      .catch(() => {
        setLoadError(true)
        setLoaded(true)
      })
  }

  const labelForAudience = (a: Audience) =>
    ({ all: labels.audienceAll, free: labels.audienceFree, pro: labels.audiencePro, admin: labels.audienceAdmin })[a]
  const labelForPriority = (p: Priority) =>
    ({ low: labels.priorityLow, normal: labels.priorityNormal, high: labels.priorityHigh, urgent: labels.priorityUrgent })[p]
  const labelForStatus = (s: Status) =>
    ({ draft: labels.statusDraft, published: labels.statusPublished, archived: labels.statusArchived })[s]

  const publishedCount = announcements.filter((a) => a.status === "published").length
  const draftCount = announcements.filter((a) => a.status === "draft").length
  const urgentCount = announcements.filter((a) => a.priority === "urgent" && a.status === "published").length

  const handleSave = () => {
    const isEdit = !!editId
    startSave(async () => {
      try {
        const res = await apiClient("/api/admin/announcements", {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(isEdit ? { id: editId, ...form } : form),
        })
        if (!res.ok) throw new Error("failed")
        const d = await res.json()
        if (isEdit) {
          setAnnouncements((prev) => prev.map((a) => (a.id === editId ? d.announcement : a)))
          larasToast.success(labels.updated)
        } else {
          setAnnouncements((prev) => [d.announcement, ...prev])
          larasToast.success(labels.created)
        }
        setDialogOpen(false)
        setEditId(null)
        router.refresh()
      } catch {
        larasToast.error(labels.error)
      }
    })
  }

  const handleQuickAction = (id: string, action: "publish" | "unpublish" | "archive" | "delete") => {
    if (action === "delete") {
      startSave(async () => {
        try {
          const res = await apiClient(`/api/admin/announcements?id=${id}`, { method: "DELETE" })
          if (!res.ok) throw new Error("failed")
          setAnnouncements((prev) => prev.filter((a) => a.id !== id))
          larasToast.success(labels.deleted)
          router.refresh()
        } catch {
          larasToast.error(labels.error)
        }
      })
      return
    }
    const newStatus: Status = action === "publish" ? "published" : action === "unpublish" ? "draft" : "archived"
    startSave(async () => {
      try {
        const res = await apiClient("/api/admin/announcements", {
          method: "PATCH",
          body: JSON.stringify({ id, status: newStatus }),
        })
        if (!res.ok) throw new Error("failed")
        const d = await res.json()
        setAnnouncements((prev) => prev.map((a) => (a.id === id ? d.announcement : a)))
        larasToast.success(labels.updated)
        router.refresh()
      } catch {
        larasToast.error(labels.error)
      }
    })
  }

  if (!loaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError) {
    return (
      <Card className="shadow-soft">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          {labels.error}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={labels.statsPublished} value={publishedCount} />
        <StatCard label={labels.statsDraft} value={draftCount} />
        <StatCard label={labels.statsUrgent} value={urgentCount} />
      </div>

      {/* New button */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditId(null)
            setForm({ title: "", body: "", audience: "all", priority: "normal", status: "draft" })
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {labels.newAnnouncement}
        </Button>
      </div>

      {/* List */}
      {announcements.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {labels.noAnnouncements}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <Card key={a.id} className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {a.priority === "urgent" && <AlertCircle className="h-4 w-4 text-destructive" />}
                      <h3 className="font-serif text-base font-semibold">{a.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {labelForAudience(a.audience)}
                      </Badge>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", PRIORITY_STYLE[a.priority])}>
                        {labelForPriority(a.priority)}
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLE[a.status])}>
                        {labelForStatus(a.status)}
                      </span>
                      {a.publishedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(a.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {a.status === "draft" && (
                      <Button size="sm" variant="ghost" onClick={() => handleQuickAction(a.id, "publish")} disabled={saving}>
                        <Send className="h-3.5 w-3.5" />
                        <span className="ml-1 hidden sm:inline">{labels.publish}</span>
                      </Button>
                    )}
                    {a.status === "published" && (
                      <Button size="sm" variant="ghost" onClick={() => handleQuickAction(a.id, "unpublish")} disabled={saving}>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span className="ml-1 hidden sm:inline">{labels.unpublish}</span>
                      </Button>
                    )}
                    {a.status !== "archived" && (
                      <Button size="sm" variant="ghost" onClick={() => handleQuickAction(a.id, "archive")} disabled={saving}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditId(a.id)
                        setForm({ title: a.title, body: a.body, audience: a.audience, priority: a.priority, status: a.status })
                        setDialogOpen(true)
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleQuickAction(a.id, "delete")} disabled={saving}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && (setDialogOpen(false), setEditId(null))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              {editId ? labels.editAnnouncement : labels.newAnnouncement}
            </DialogTitle>
            <DialogDescription>{labels.adminDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.titleLabel}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.bodyLabel}</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={4}
                className="resize-none text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{labels.audienceLabel}</Label>
                <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v as Audience }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{labels.audienceAll}</SelectItem>
                    <SelectItem value="free">{labels.audienceFree}</SelectItem>
                    <SelectItem value="pro">{labels.audiencePro}</SelectItem>
                    <SelectItem value="admin">{labels.audienceAdmin}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{labels.priorityLabel}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as Priority }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{labels.priorityLow}</SelectItem>
                    <SelectItem value="normal">{labels.priorityNormal}</SelectItem>
                    <SelectItem value="high">{labels.priorityHigh}</SelectItem>
                    <SelectItem value="urgent">{labels.priorityUrgent}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{labels.statusLabel}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{labels.statusDraft}</SelectItem>
                    <SelectItem value="published">{labels.statusPublished}</SelectItem>
                    <SelectItem value="archived">{labels.statusArchived}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => (setDialogOpen(false), setEditId(null))}>
              {labels.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.body.trim()}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-4">
        <p className="font-serif text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
